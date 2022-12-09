import {
  BaseCommand,
  flags,
} from '@adonisjs/core/build/standalone'
import acme from "handyacme"

import { defaultCa, defaultEmail, defaultEnv } from 'Config/app'

import { getAuthorityName, AvailableCaAlias, AvailableEnv } from "./"

export default class AccountCreate extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'account:create'

  /**
   * Command description is displayed in the "help" output
   */
  public static description = `create account for cert authority. example: node ace account:create --email admin@exmaple.com --env=staging --ca=le`


  @flags.string()
  public email: string

  @flags.string({
    description: "default environment production. options: staging | production",
  })
  public env: AvailableEnv

  @flags.string({
    description: "default letsencrypt, options: letsencrypt | le | zerossl | zs | buypass | bp"
  })
  public ca: AvailableCaAlias

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

  private get authorityName() {
    const ca = this.ca || defaultCa
    return getAuthorityName(ca)
  }

  private get authorityEnv() {
    return this.env || defaultEnv
  }

  public async run() {
    const email = this.email || defaultEmail
    const { default: Account } = await import("App/Models/Account")

    const existsUser = await Account.findUnique({
      email,
      ca: this.authorityName,
      type: this.authorityEnv
    })
    if (existsUser) {
      return this.logger.info(`${email} already exists in ${this.authorityName} ${this.authorityEnv} mode`)
    }
    const ca = await acme.create(this.authorityName, this.authorityEnv)
    await ca.createAccount(email)
    
    const accountInfo = {
      jwk: await ca.account.exportPrivateJwk(),
      email: ca.account.email,
      accountUrl: ca.account.accountUrl,
      ca: this.authorityName,
      type: this.authorityEnv
    }
    await Account.create(accountInfo)
    this.logger.info(`An account created in ${this.authorityName} ${this.authorityEnv} mode`)
  }
}
