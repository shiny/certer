import {
  args
} from '@adonisjs/core/build/standalone'
import { OrderBaseCommand } from "./"


export default class OrderCreate extends OrderBaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'order:create'

  /**
   * Command description is displayed in the "help" output
   */
  public static description = 'Create certification order'

  @args.spread({
    description: 'domains, e.g. --domains *.example.com www.example.com'
  })
  public domains: string[]

  public static settings = {
    loadApp: true,
    stayAlive: false,
  }

  public showCreateAccountTips() {
    this.logger.info(`Run ${this.colors.green("node ace account:create")} to create the account first`)
  }

  public async run() {

    const user = await this.findAccount()
    if (!user) {
      this.showCreateAccountTips()
      this.logger.error(`User not exists: ${this.authorityEmail} in ${this.authorityName} ${this.authorityEnv} mode`)
      return
    }

    if (await this.findOrder(this.domains[0])) {
      return this.logger.error('Order with same ca/env/email/name already exists, please continue the previous order')
    }

    this.logger.logUpdate(`[1/5] Creating ACME client...`)
    const client = await this.createAcmeClient()

    this.logger.logUpdate(`[2/5] Importing account ${user.email}...`)
    await client.importAccount({
      email: user.email,
      accountUrl: user.accountUrl,
      jwk: user.jwk
    })

    this.logger.logUpdate('[3/5] Creating order...')
    const order = await client.createOrder(this.domains)

    this.logger.logUpdate('[4/5] Creating authorizations...')
    const authorizations = await order.authorizations()

    this.logger.logUpdate('[5/5] Saving...')
    const { default: CertOrder } = await import("App/Models/CertOrder")
    await CertOrder.createCertOrder({
      order,
      account: client.account,
      authorizations
    })

    this.logger.logUpdatePersist()
    this.logger.info('Order created')
    this.logger.info(`Next command: ${await this.dnsSetCommand(this.domains[0])}`)
  }

  public async dnsSetCommand(firstDomainName: string){
    
    const commands: string[] = [
      'node ace dns:set'
    ]
    commands.push(`${firstDomainName}`)

    const { default: DnsCred } = await import("App/Models/DnsCred")
    const hasDefaultCred = await DnsCred.hasDefaultCred()
    if (!hasDefaultCred) {
      commands.push(`--cred [Your cred name]`)
    }

    if (this.ca) {
      commands.push(`--ca ${this.ca}`)
    }
    if (this.env) {
      commands.push(`--env ${this.env}`)
    }
    if (this.email) {
      commands.push(`--email ${this.email}`)
    }
    return this.colors.green(commands.join(' '))
  }
}
