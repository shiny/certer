import { args, flags } from '@adonisjs/core/build/standalone'
import { base } from "./"
import Deployment from 'App/Models/Deployment'

export default class CertDeploy extends base() {
  public static commandName = 'cert:deploy'

  public static description = 'Deploy certificate'

  public static settings = {
    loadApp: true,
    stayAlive: false,
  }
  
  @args.string({
    description: 'domain name or id of a deployment',
    required: false
  })
  public domainOrId: string

  @flags.boolean()
  public all: boolean

  public async run() {

    if (!this.all && !this.domainOrId) {
      return this.kernel.printHelp(CertDeploy)
    }

    const { default: Deployment } = await import("App/Models/Deployment")

    const deployments: Deployment[] = [] 
    if (this.all) {
      deployments.push(...await Deployment.all())
    } else {
      const isNumber = /^\d+$/.test(this.domainOrId)
      if (isNumber) {
        deployments.push(await Deployment.findOrFail(this.domainOrId))
      } else {
        deployments.push(...await Deployment.findExistingAll({
          ca: this.authorityName,
          domainName: this.domainOrId,
          type: this.authorityEnv,
          email: this.authorityEmail
        }))
      }
    }
    for(let deployment of deployments) {
      this.logger.info('deploying ' + deployment.domainName)
      const output = await deployment.deploy()
      this.logger.info(output)
      this.logger.action('deployed').succeeded(deployment.domainName)
    }
  }
}
