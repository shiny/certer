import { 
  BaseCommand,
  flags
} from '@adonisjs/core/build/standalone'

export default class CaClear extends BaseCommand {
  public static commandName = 'ca:clear'

  public static description = 'clear the table cert_authorities'

  @flags.boolean({ alias: 'y', description: 'confirm to clear the table cert_authorities'})
  public yes: boolean

  public static settings = {
    loadApp: true,
    stayAlive: false,
  }

  public async run() {
    if (!this.yes) {
      return this.logger.info(`use flag ${this.colors.red('--yes')} to continue`)
    }
    const { default: CertAuthority } = await import("App/Models/CertAuthority")
    await CertAuthority.truncate()
  }
}
