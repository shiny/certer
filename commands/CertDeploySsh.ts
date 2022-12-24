import { args, flags } from '@adonisjs/core/build/standalone'
import { base } from "./"
import Ssh from 'App/Deployments/Provider/Ssh'
import { buildUri } from 'App/Models/Deployment'

export default class CertDeploySsh extends base() {

  public static commandName = 'cert:deploy-ssh'

  public static description = 'Deploy cert to remote ssh host'

  public static settings = {
    loadApp: true,
    stayAlive: false,
  }

  @flags.string({
    description: 'ssh host to deploy',
    alias: 'H'
  })
  public host: string

  @flags.number({
    description: 'ssh port, default 22',
    alias: 'P'
  })
  public port: number = 22

  @flags.string({
    description: 'ssh user, default root',
    alias: 'u'
  })
  public user: string = 'root'

  @flags.string({
    description: 'ssh key file',
  })
  public sshPrivateKey: string

  @flags.string({
    description: 'remote ssh location to deploy certificate key file',
  })
  public keyFile: string

  @flags.string({
    description: 'remote ssh location to deploy certificate cert file',
  })
  public certFile: string

  @flags.string({
    description: 'ssh reload command to reload cerificate',
  })
  public reloadCommand: string

  @flags.boolean({
    description: 'save the deployment to database'
  })
  public save: boolean = false

  @args.string({
    description: 'certificate domain name',
    required: false
  })
  public domain: string

  public async run() {
    if (!this.domain) {
      return this.kernel.printHelp(CertDeploySsh)
    }
    
    const cert = await this.findCert(this.domain)
    if (!cert) {
      return this.logger.action('deploy').failed(`Can not find specified certificate`, this.domain)
    }

    if (!this.sshPrivateKey) {
      return this.logger.action('deploy').failed(`--sshKey is required`, '')
    }

    if (!this.keyFile || !this.certFile) {
      return this.logger.action('deploy').failed(`--keyFile and --certFile are required`, 'remote path for cerificate')
    }

    const ssh = new Ssh
    const config = {
      host: this.host,
      port: this.port,
      user: this.user,
      sshPrivateKey: this.sshPrivateKey,
      reloadCommand: this.reloadCommand,
      keyFile: this.keyFile,
      certFile: this.certFile
    }
    const output = await ssh.exec(cert, config)
    if (output) {
      console.log(output.toString())
    }
    if (this.save) {
      const { default: Deployment } = await import("App/Models/Deployment")
      const deploy = await Deployment.create({
        ca: this.authorityName,
        type: this.authorityEnv,
        email: this.authorityEmail,
        domains: cert.domains,
        domainName: cert.name,
        provider: 'Ssh',
        config,
        uri: buildUri('ssh', config)
      })
      this.logger.action('deploy').succeeded(`Deployment #${deploy.id} Created.`)
    }
  }
}
