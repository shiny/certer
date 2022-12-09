import { BaseCommand } from '@adonisjs/core/build/standalone'
import acme from "handyacme"

type Authority = {
  ca: "LetsEncrypt" | "ZeroSSL",
  type: "staging" | "production"
}

export default class CaDiscover extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'ca:discover'

  /**
   * Command description is displayed in the "help" output
   */
  public static description = 'Discover all ca directories to database'

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
    const { default: CertAuthority } = await import("App/Models/CertAuthority")
    const supportedCertAuthorities: Authority[] = [
      { ca: "LetsEncrypt", type: "staging" },
      { ca: "LetsEncrypt", type: "production" },
      { ca: "ZeroSSL", type: "production" },
    ]
    const firstCa = await CertAuthority.first()

    // not initialized yet
    if(firstCa === null) {
      for(const { ca, type } of supportedCertAuthorities) {
        const authority = await acme.create(ca, type)
        await CertAuthority.create({
          ca,
          type,
          directoryUrl: authority.directory.directoryUrl,
          newNonce: authority.directory.newNonce,
          newAccount: authority.directory.newAccount,
          newOrder: authority.directory.newOrder,
          revokeCert: authority.directory.revokeCert,
          keyChange: authority.directory.keyChange,
          externalAccountRequired: authority.directory.meta.externalAccountRequired
        })
        this.logger.info(`${ca} ${type}: ${authority.directory.directoryUrl}`)
      }
    } else {
      this.logger.info('cert_authorities has initialized, please ca:clear --confirm to clear table first.')
    }

  }
}
