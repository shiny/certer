import { args, BaseCommand, flags } from '@adonisjs/core/build/standalone'
import { getAuthorityName, AvailableCa, AvailableCaAlias, AvailableEnv } from "./"
import { defaultCa, defaultEmail, defaultEnv } from 'Config/app'
import Acme from "handyacme"

export default class OrderFinish extends BaseCommand {

  public static commandName = 'order:finish'

  public static description = 'Finish the verification and download cert'

  @args.string()
  public domain: string

  @flags.string({ description: "order's account email"})
  public email: string

  @flags.string({
    description: "options: letsencrypt | le | zerossl | zs | buypass | bp" + (defaultCa ? `, default ${defaultCa}` : '')
  })
  public ca: AvailableCaAlias

  @flags.string({
    description: "options: staging | production" + (defaultEnv ? `, default ${defaultEnv}` : ''),
  })
  public env: AvailableEnv

  @flags.boolean({
    alias: 'y',
    description: 'confirm the challenge has done'
  })
  public yes: boolean
  
  public static settings = {
    loadApp: true,
    stayAlive: false,
  }

  public async run() {
    //
    if (!this.yes) {
      this.exitCode = 1
      return this.showConfirmTips()
    }
    const { default: CertOrder } = await import('App/Models/CertOrder')

    const authorityAlias = this.ca || defaultCa
    const authorityName = getAuthorityName(authorityAlias)
    const authorityEnv = this.env || defaultEnv
    const email = this.email || defaultEmail
    
    const { default: Account } = await import('App/Models/Account')
    const user = await Account.findUnique({
      email,
      ca: authorityName,
      type: authorityEnv
    })
    if (!user) {
      this.logger.error(`User not exists: ${email} in ${authorityName} ${authorityEnv} mode`)
      return
    }

    const order = await CertOrder.findExistingOne({
      ca: authorityName,
      type: authorityEnv,
      email,
      name: this.domain
    })
    if (!order) {
      return this.logger.error('Order does not exists')
    }
    await order.load('challenges')
    

    const acmeClient = await Acme.create(order.ca as AvailableCa, order.type as AvailableEnv)
    await user.loadIntoAcmeClient(acmeClient)

    const waitSeconds = 1
    let retry = 0
    while(!await order.waitForChallengesReady(acmeClient, waitSeconds)) {
      retry++
      this.logger.logUpdate(`retrying challenge(${retry})...`)
    }
    this.logger.logUpdatePersist()
    this.logger.action('Authorization').succeeded('passed')

    const { default: Cert } = await import("App/Models/Cert")
    retry = 0
    do {
      try {
        await order.waitForStatusReadyAndSave(acmeClient, waitSeconds)
        retry++
      } catch (err) {
        this.logger.action('finish').failed('Order is invalid', 'you should recreate an order')
        break
      }
      // finalize order when ready
      if (order.isReady) {
        const cert = await Cert.createFromOrder(order)
        const { certificate: certificateUrl } = await cert.finalize(acmeClient)
        order.certificateUrl = certificateUrl
        await order.save()
        await cert.save()
        this.logger.action('finalize').succeeded('succeed')
      // download order when valid
      } else if (order.isValid) {
        const cert = await Cert.findByOrFail('certOrderId', order.id)
        await cert.downloadSave(acmeClient)
        this.logger.action('download').succeeded('succeed')
        break
      // wait for pending or processing
      } else if (order.isPending || order.isProcessing) {
        this.logger.logUpdate(`retrying load order(${retry})...`)
      } else {
        throw new Error(`Unexpect order status ${order.status}`)
      }
    } while(true)
    // this.logger.info(`retry an another request`, `${retry}/${maxRetry}`)
  }

  showConfirmTips() {
    const tips = 'You need to recreate order if challenge DNS is not take effect yet'
    this.logger.action('finish').failed(`Use ${this.colors.red('--yes')} to continue`, tips)
  }
}
