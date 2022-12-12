import { BaseCommand } from '@adonisjs/core/build/standalone'
import acme from "handyacme"

type Authority = {
  ca: "LetsEncrypt" | "ZeroSSL",
  type: "staging" | "production"
}

export default class CaDiscover extends BaseCommand {
  
  public static commandName = 'ca:discover'
  public static description = 'Discover all ca directories to database'

  public static settings = {
    loadApp: true,
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
