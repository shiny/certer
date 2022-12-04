import {
  BaseCommand,
  flags,
  args
} from '@adonisjs/core/build/standalone'
import acme from "handyacme"

import { getAuthorityName, AvailableCaAlias, AvailableEnv } from "./"

import { defaultCa, defaultEmail, defaultEnv } from 'Config/app'

export default class OrderCreate extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'order:create'

  /**
   * Command description is displayed in the "help" output
   */
  public static description = 'create certification order'

  @args.spread()
  public domains: string[]

  @flags.string({ description: "order's account email"})
  public email: string

  @flags.string({
    description: "options: letsencrypt | le | zerossl | zs | buypass | bp"
  })
  public ca: AvailableCaAlias

  @flags.string({
    description: "options: staging | production",
  })
  public env: AvailableEnv

  public static settings = {
    /**
     * Set the following value to true, if you want to load the application
     * before running the command. Don't forget to call `node ace generate:manifest` 
     * afterwards.
     */
    loadApp: true,

    /**
     * Set the following value to true, if you want this command to keep running until
     * you manually decide to exit the process. Don't forget to call 
     * `node ace generate:manifest` afterwards.
     */
    stayAlive: false,
  }

  public async run() {

    const { default: Account } = await import('App/Models/Account')

    const authorityAlias = this.ca || defaultCa
    const authorityName = getAuthorityName(authorityAlias)
    const authorityEnv = this.env || defaultEnv
    const email = this.email || defaultEmail

    const user = await Account.findUnique({
      email,
      ca: authorityName,
      type: authorityEnv
    })
    if (!user) {
      this.logger.info(`Run ${this.colors.green("node ace account:create")} to create the account first`)
      this.logger.error(`User not exists: ${email} in ${authorityName} ${authorityEnv} mode`)
      return
    }

    const client = await acme.create(authorityName, authorityEnv)
    await client.importAccount({
      email: user.email,
      accountUrl: user.account_url,
      jwk: user.jwk
    })
    const order = await client.createOrder(this.domains)
    console.log(order)
    this.logger.info('Order created')
  }
}
