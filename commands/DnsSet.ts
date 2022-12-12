import { args, flags } from '@adonisjs/core/build/standalone'
import { base } from './'
import Dns from 'App/Dns'

export default class DnsSet extends base() {

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

  @flags.boolean({
    description: "Delete the added txt record on _acme-challenge.hostname"
  })
  public rm: boolean

  public async run() {

    const order = await this.findOrder(this.domain)
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
      if (this.rm) {
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
