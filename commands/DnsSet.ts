import { args, BaseCommand, flags } from '@adonisjs/core/build/standalone'
import { AvailableCaAlias, AvailableEnv, getAuthorityName } from './'
import { defaultCa, defaultEmail, defaultEnv } from 'Config/app'
import Dns from 'App/Dns'

export default class DnsSet extends BaseCommand {

  public static commandName = 'dns:set'
  public static description = 'Set dns record for certification orders'

  public static settings = {
    loadApp: true,
    stayAlive: false,
  }

  @flags.string()
  public cred: string

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

  @flags.boolean({
    description: "Delete the added txt record on _acme-challenge.hostname"
  })
  public delete: boolean

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
      return this.logger.action('set').failed('Can not find existing order', this.domain)
    }
    await order.load('challenges')

    const cred = await this.fetchDnsCred()
    if (!cred) {
      return this.logger.action('set').failed('--cred is required.', '')
    }

    const dns: Dns = this.application.container.use("Dns")
    
    if (!dns.isSupporttedProvider(cred.provider)) {
      this.exitCode = 1
      return this.logger.action('set').failed('provider did not supported yet', cred.provider)
    }

    await dns.chooseProvider(cred.provider)
    await dns.useCred(cred.creds)

    for(const challenge of order.challenges) {
      const hostname = `_acme-challenge.${challenge.identifierValue}`
      const isExist = await dns.doesTxtRecordExist(hostname, challenge.signKey)
      // should delete
      if (this.delete) {
        if (!isExist) {
          return this.logger.action('delete').skipped(`${this.colors.green(hostname)} did not exist`)
        }
        await dns.deleteTxtRecord(hostname, challenge.signKey)
        this.logger.action('delete').succeeded(hostname)
      // or set
      } else {
        if (isExist) {
          return this.logger.action('set').skipped(`${this.colors.green(hostname)} already exists`)
        } else {
          await dns.setTxtRecord(hostname, challenge.signKey)
          this.logger.action('set').succeeded(hostname)
        }
      }
    }
  }

  /**
   * get dnsCred from --cred or get the default
   * @returns 
   */
  public async fetchDnsCred() {
    const { default: DnsCred } = await import('App/Models/DnsCred')
    if (this.cred) {
      return DnsCred.findByOrFail('name', this.cred)
    } else {
      return DnsCred.getDefaultCred()
    }
  }
}
