import { args, flags } from '@adonisjs/core/build/standalone'
import { base } from './'
import Local from 'App/Deployments/Provider/Local'

export default class CertExport extends base() {

  public static commandName = 'cert:export'
  public static description = 'Export certificate / key to files'

  public static settings = {
    loadApp: true,
    stayAlive: false,
  }

  @flags.string({
    description: 'Key file'
  })
  public key: string

  @flags.string({
    description: 'Cert file'
  })
  public cert: string

  @flags.boolean({
    description: "Overwrite file?",
    alias: "y"
  })
  public yes: boolean

  @args.string({
    description: 'Domain Name'
  })
  public domain: string

  public async run() {

    if (!this.key || !this.cert) {
      return this.logger.action('export').failed(`You must specify ${this.colors.green('--key')} and ${this.colors.green('--cert')}`, 'key/cert file path')
    }

    const { default: Cert } = await import('App/Models/Cert')
    const cert = await Cert.query()
      .where('ca', this.authorityName)
      .where('type', this.authorityEnv)
      .where('email', this.authorityEmail)
      .where('name', this.domain)
      .first()
    if (!cert) {
      return this.logger.action('export').failed('Cert not found', `${this.authorityName} ${this.authorityEnv} mode with email ${this.authorityEmail}`)
    }
    if (!cert.cert) {
      return this.logger.action('export').failed(`Cert content is empty`, `maybe order #${cert.certOrderId} did not finished yet `)
    }
    const deployConfig = {
      certFile: this.cert,
      keyFile: this.key,
    }
    const local = new Local()
    if (await local.exists(cert, deployConfig) && !this.yes) {
      return this.showConfirmTips('Are you confirm to overwrite files?')
    }
    await local.exec(cert, deployConfig)
  }
}
