import { base } from "./"

export default class AccountCreate extends base() {

  public static commandName = 'account:create'
  public static description = `create account for cert authority. example: node ace account:create --email admin@exmaple.com --env=staging --ca=le`

  public static settings = {
    loadApp: true,
    stayAlive: false,
  }

  public async run() {
    
    const user = await this.findAccount()
    if (user) {
      return this.logger.info(`${this.authorityEmail} already exists in ${this.authorityName} ${this.authorityEnv} mode`)
    } else {
      await this.createAccount()
      this.logger.info(`An account created in ${this.authorityName} ${this.authorityEnv} mode`)
    }

  }
}
