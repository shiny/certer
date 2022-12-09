import { args, BaseCommand, flags } from '@adonisjs/core/build/standalone'
import { AvailableCaAlias, AvailableEnv, getAuthorityName } from './'
import { defaultCa, defaultEmail, defaultEnv } from 'Config/app'
import { Resolver } from 'node:dns/promises'

/**
 * Resolve example
 * [
 *    [ 'verification-code-site-App_feishu=wkfvRjBMoN6f9bQzsjJZ' ],
 *    [ 'v=spf1 +include:_netblocks.m.feishu.cn ~all' ]
 * ]
 * @param records string[][]
 * @param txt 
 */
function hasTxtRecord(records:string[][], txt: string) {
  return records.some(recordArr => recordArr.includes(txt))
}

export default class DnsVerify extends BaseCommand {
  public static commandName = 'dns:verify'

  public static description = 'Verify dns challenge'

  public static settings = {
    loadApp: true,
    stayAlive: false,
  }

  @args.string()
  public domain: string

  @flags.string({ description: "Order's account email" + (defaultEmail ? `, default ${defaultEmail}` : '')})
  public email: string

  @flags.string({
    description: "Options: letsencrypt | le | zerossl | zs | buypass | bp" + (defaultCa ? `, default ${defaultCa}` : '')
  })
  public ca: AvailableCaAlias

  @flags.string({
    description: "Options: staging | production" + (defaultEnv ? `, default ${defaultEnv}` : ''),
  })
  public env: AvailableEnv

  @flags.array({
    description: "Specify DNS(UDP) nameserver list"
  })
  public nameserver: string[]

  public async run() {
    const { default: CertOrder } = await import('App/Models/CertOrder')
    
    const authorityAlias = this.ca || defaultCa
    const authorityName = getAuthorityName(authorityAlias)
    const authorityEnv = this.env || defaultEnv
    const email = this.email || defaultEmail
    
    const order = await CertOrder.findExistingOne({
      ca: authorityName,
      type: authorityEnv,
      email,
      name: this.domain
    })
    if (!order) {
      return this.logger.action('verified').failed('Can not find existing order', this.domain)
    }
    await order.load('challenges')
    const resolver = await this.prepareNameServer()

    for(const challenge of order.challenges) {
      const domain = `_acme-challenge.${challenge.identifierValue}`
      try {
        const records = await resolver.resolveTxt(domain)
        const exists = hasTxtRecord(records, challenge.signKey)
        if (exists) {
          this.logger.action('verified').succeeded(domain)
        } else {
          this.logger.action('verified').failed('Txt record not found in '+ domain, challenge.signKey)
        }
      } catch (err) {
        if (err.code === 'ENODATA') {
          this.logger.action('verified').failed('No available TXT record', domain)
        } else {
          throw err
        }
      }
    }
  }

  async prepareNameServer() {
    const resolver = new Resolver()
    if (Array.isArray(this.nameserver) && this.nameserver.length > 0) {
      this.logger.info(`Nameserver ${this.nameserver.map(server => this.colors.green(server)).join(',')}`)
      resolver.setServers(this.nameserver)
    }
    return resolver
  }
}
