import { BaseCommand, flags } from '@adonisjs/core/build/standalone'

export default class DnsCred extends BaseCommand {
  
  public static commandName = 'dns:cred'
  public static description = 'Create/Update/Delete a dns credential'

  public static settings = {
    loadApp: true,
    stayAlive: false,
  }

  @flags.string({
    description: 'Dns Provider, e.g. aliyun',
  })
  public provider: string

  @flags.boolean({
    description: "List supportted dns providers"
  })
  public list: boolean

  @flags.boolean({
    description: "Delete credential by --cred [credential name]"
  })
  public rm: boolean

  @flags.string({
    description: 'Credential name'
  })
  public cred: string

  /**
   * show the supportted dns providers in command
   */
  public showProviders() {
    const dns = this.application.container.use('Dns')
    const table = this.ui.table()
    table.head(['DNS Provider'])
    for(let provider of dns.supporttedProviders) {
      table.row([ provider ])
    }
    table.render()
  }

  /**
   * show flag tips
   */
  public showTips() {
    const dns = this.application.container.use('Dns')
    const supporttedProviders = dns.supporttedProviders.join('|')
    const tips = `${this.colors.green('--provider')} is required, supportted providers are: ${supporttedProviders}`
    this.logger.info(tips)
  }

  public async onDelete() {

    if (!this.cred) {
      return this.logger.error(`${this.colors.green('--cred [credential name]')} is required`)
    }

    const { default: DnsCred } = await import('App/Models/DnsCred')
    const cred = await DnsCred.findBy('name', this.cred)
    if (!cred) {
      this.logger.error(`Credentail name ${this.colors.red(this.cred)} not found.`)
    } else {
      await cred.delete()
    }
  }

  public async run() {

    if (this.list) {
      return this.showProviders()
    }

    if (this.rm) {
      return await this.onDelete()
    }

    if (!this.provider) {
      return this.showTips()
    }

    const dns = this.application.container.use('Dns')
    try {
      if (!dns.isSupporttedProvider(this.provider)) {
        throw new Error()
      }
      await dns.chooseProvider(this.provider)
    } catch (e) {
      return this.logger.error(`DNS Provider ${this.provider} did not supportted yet.`)
    }

    const result = await dns.inputCred(this)
    if (result) {
      const { default: DnsCred } = await import('App/Models/DnsCred')
      const dnsCred = await DnsCred.updateOrCreate({
        name: result.name,
      }, {
        name: result.name,
        creds: result,
        provider: this.provider
      })
      const credFlag = this.colors.green('--cred ' + dnsCred.name)
      this.logger.success(`Credentials Saved. ${credFlag} to use it.`)
    }
  }
}
