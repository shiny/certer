import { args, flags } from '@adonisjs/core/build/standalone'
import sleep from 'App/Helpers/Sleep'
import { base } from "./"

export default class CertRenew extends base() {

  public static commandName = 'cert:renew'
  public static description = 'Renew certificate'
  
  @args.string()
  public domain: string

  /**
   * sleep(seconds) after dns set
   * wait for DNS resolution take effect
   */
  @flags.number()
  public sleep: number = 10

  public static settings = {
    loadApp: true,
    stayAlive: false,
  }

  public async run() {
    
    const user = await this.findAccount()
    if (!user) {
      this.logger.error(`User not exists: ${this.authorityEmail} in ${this.authorityName} ${this.authorityEnv} mode`)
      return
    }

    const cert = await this.findCert(this.domain)
    if (!cert) {
      return this.logger.action('renew').failed('Cert not found', `${this.authorityName} ${this.authorityEnv} mode with email ${this.authorityEmail}`)
    }
    const cred = await this.findDnsCred(cert.dnsCredName)
    if (!cred) {
      return this.logger.action('renew').failed(`Dns cred not found`, cert.dnsCredName)
    }
    const orderParams = [
      '--ca', cert.ca,
      '--env', cert.type,
      '--email', cert.email
    ]
    console.log(orderParams)
    await this.kernel.exec('order:create', this.buildParams(
      cert.domains, orderParams
    ))
    await this.kernel.exec('dns:set', this.buildParams(
      cert.name,
      orderParams
    ))
    this.logger.info(`wait for ${this.sleep} seconds`)
    await sleep(this.sleep)
    await this.kernel.exec('order:finish', this.buildParams(
      cert.name,
      orderParams,
      '--yes'
    ))
    await this.kernel.exec('dns:set', this.buildParams(
      cert.name,
      orderParams,
      '--rm'
    ))
    await this.kernel.exec('order:purge', this.buildParams(
      cert.name,
      orderParams,
      '--yes'
    ))
  }

  buildParams(...args: any[]) {
    return args.flat()
  }
}
