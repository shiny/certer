import { args, BaseCommand, flags } from '@adonisjs/core/build/standalone'
import { getAuthorityName, AvailableCaAlias, AvailableEnv } from "./"
import { defaultCa, defaultEmail, defaultEnv } from 'Config/app'

export default class OrderPurge extends BaseCommand {
  
  public static commandName = 'order:purge'

  public static description = 'Purge exist orders'

  public static settings = {

    loadApp: true,
    
    stayAlive: false,
  }


  @args.spread({
    description: 'Domain names to purge'
  })
  public domains: string[]

  @flags.string({ description: "order's account email"})
  public email: string

  @flags.string({
    description: "options: letsencrypt | le | zerossl | zs | buypass | bp" + (defaultCa ? `, default ${defaultCa}` : '')
  })
  public ca: AvailableCaAlias

  @flags.string({
    description: "options: staging | production" + (defaultEnv ? `, default ${defaultEnv}` : ''),
  })
  public env: AvailableEnv

  @flags.boolean({
    alias: 'y',
    description: 'confirm the challenge has done'
  })
  public yes: boolean

  public async run() {
    if (!this.yes) {
      this.exitCode = 1
      return this.showConfirmTips()
    }
    const { default: CertOrder } = await import('App/Models/CertOrder')

    const authorityAlias = this.ca || defaultCa
    const authorityName = getAuthorityName(authorityAlias)
    const authorityEnv = this.env || defaultEnv
    const email = this.email || defaultEmail

    for(const domain of this.domains) {
      const order = await CertOrder.findExistingOne({
        ca: authorityName,
        type: authorityEnv,
        email,
        name: domain
      })
      if (!order) {
        return this.logger.action('remove').failed('Order does not exists', domain)
      }
      await order.delete()
    }
  }

  showConfirmTips() {
    const tips = 'are you confirm the removal?'
    this.logger.action('remove').failed(`Use ${this.colors.red('--yes')} to continue`, tips)
  }
}
