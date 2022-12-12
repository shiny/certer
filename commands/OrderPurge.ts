import { args, flags } from '@adonisjs/core/build/standalone'
import { base } from "./"

export default class OrderPurge extends base() {
  
  public static commandName = 'order:purge'
  public static description = 'Purge exist orders'

  public static settings = {
    loadApp: true,
    stayAlive: false,
  }

  @args.spread({
    description: 'domains, e.g. *.example.com www.example.com'
  })
  public domains: string[]

  @flags.boolean({
    alias: 'y',
    description: 'confirm the challenge has done'
  })
  public yes: boolean

  public async run() {
    if (!this.yes) {
      this.exitCode = 1
      return this.showConfirmTips(`are you confirm the removal?`)
    }

    for(const domain of this.domains) {
      const order = await this.findOrder(domain)
      if (!order) {
        return this.logger.action('remove').failed('Order does not exists', domain)
      }
      await order.delete()
    }
  }
}
