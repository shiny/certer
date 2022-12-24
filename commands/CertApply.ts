import { flags } from '@adonisjs/core/build/standalone'
import { existsSync } from 'node:fs'
import * as TOML from '@ltd/j-toml'
import { readFile } from "node:fs/promises"
import { base, getAuthorityName } from './'
import sleep from 'App/Helpers/Sleep'

export default class CertApply extends base() {

  public static commandName = 'cert:apply'

  public static description = ''

  /**
   * sleep(seconds) after dns set
   * wait for DNS resolution take effect
   */
  @flags.number()
  public sleep: number = 10

  public static settings = {
    loadApp: true,
    stayAlive: false,
  }

  @flags.string({
    description: 'TOML config file',
    alias: 'f'
  })
  public file: string

  buildParams(...args: any[]) {
    return args.flat()
  }

  public async run() {
    if (!this.file || !existsSync(this.file)) {
      return this.logger.action('input').failed(
        this.colors.green('--file') + ' or ' + 
        this.colors.green('-f') + ' is required', 
        'must be an exist configure file'
      )
    }
    const content = await readFile(this.file)
    const result = TOML.parse(content, '\n')

    const ca = getAuthorityName(result?.order?.['ca'] || this.authorityName)
    const email = result?.order?.['email'] || this.authorityEmail
    const env = result?.order?.['env'] || this.authorityEnv

    const orderParams = [
      '--ca', ca,
      '--env', env,
      '--email', email
    ]
    // console.log(result)
    // await this.exit()


    const { default: Account } = await import('App/Models/Account')
    const account = await Account.findUnique({
      email,
      ca,
      type: env
    })

    if (!account) {
      await this.kernel.exec('account:create', this.buildParams(
        orderParams
      ))
    }
    
    const cred = await this.findDnsCred(result?.order?.['dnsCred'])
    if (!cred) {
      return this.logger.action('renew').failed(`Dns cred not found`, result?.order?.['dnsCred'])
    }

    const domains = result?.order?.['domain']
    const domainName = domains[0]
    await this.kernel.exec('order:create', this.buildParams(
      domains, orderParams
    ))

    await this.kernel.exec('dns:set', this.buildParams(
      domainName,
      orderParams,
      `--cred=${cred.name}`
    ))

    this.logger.info(`wait for ${this.sleep} seconds`)
    await sleep(this.sleep * 1000)
    await this.kernel.exec('order:finish', this.buildParams(
      domainName,
      orderParams,
      '--yes'
    ))
    await this.kernel.exec('dns:set', this.buildParams(
      domainName,
      orderParams,
      `--cred=${cred.name}`,
      '--rm'
    ))
    await this.kernel.exec('order:purge', this.buildParams(
      domainName,
      orderParams,
      '--yes'
    ))

    if (result?.deploy && result?.deploy?.['type'] === 'ssh') {
      const { default: Deployment } = await import("App/Models/Deployment")
      this.logger.info('deploying')
      const deploy = await Deployment.findOrNew({
        ca,
        type: env,
        email,
        domains,
        domainName,
        provider: 'Ssh',
        config: result?.deploy,
      })
      const output = await deploy.deploy()
      if (output) {
        console.log(output.toString())
      }
      await deploy.save()
      this.logger.action('deployed').succeeded(domainName)
    }
  }
}
