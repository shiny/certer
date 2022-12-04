import { 
  BaseCommand,
  flags
} from '@adonisjs/core/build/standalone'

export default class CaClear extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'ca:clear'

  /**
   * Command description is displayed in the "help" output
   */
  public static description = 'clear the table cert_authorities'

  @flags.boolean({ alias: 'y', description: 'confirm to clear the table cert_authorities'})
  public confirm: boolean

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
    if (!this.confirm) {
      return this.logger.info('use --confirm to continue')
    }
    const { default: CertAuthority } = await import("App/Models/CertAuthority")
    await CertAuthority.truncate()
  }
}
