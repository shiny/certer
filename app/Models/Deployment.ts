import { DateTime } from 'luxon'
import { BaseModel, column, ModelAttributes } from '@ioc:Adonis/Lucid/Orm'
import Cert from './Cert'

export function buildUri(provider, config) {
  
  config.user = config.user ?? 'root'
  config.port = config.port ?? 22

  return provider.toLowerCase() + "://" + config.user + '@' +
   config.host + ":" + config.port +
   config.certFile
}

export default class Deployment extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public ca: string
  
  @column()
  public type: string

  @column()
  public email: string

  @column()
  public domainName: string

  @column()
  public uri: string

  @column({
    prepare: value => JSON.stringify(value),
    consume: value => JSON.parse(value)
  })
  public domains: string[]

  @column()
  public provider: string

  @column({
    prepare: value => JSON.stringify(value),
    consume: value => JSON.parse(value)
  })
  public config: any

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime


  public static async findExistingAll({ ca, type, domainName, email }) {
    return Deployment.query()
      .where('ca', ca)
      .where('type', type)
      .where('email', email)
      .where('domain_name', domainName)
  }

  /**
   * When there is only one cred
   * make it the default
   * @returns 
   */
  public static async hasDefaultCred() {
    const results = await Deployment.query().count('* as total')
    return results[0].$extras.total === '1'
  }

  public static async getDefaultCred() {
    if (await Deployment.hasDefaultCred()) {
      return Deployment.firstOrFail()
    }
  }

  async deploy() {
    const cert = await Cert.query()
      .where('ca', this.ca)
      .where('type', this.type)
      .where('email', this.email)
      .where('name', this.domainName)
      .firstOrFail()
    const { default: Provider } = await import("App/Deployments/Provider/" + this.provider)
    const instance = new Provider()
    return instance.exec(cert, this.config)
  }

  public static async findOrNew(fields: Omit<ModelAttributes<Deployment>, "id" | "uri" | "createdAt" | "updatedAt">) {
    const uri = buildUri(fields.type, fields.config)
    let instance = await Deployment.findBy('uri', uri)
    if (!instance) {
      instance = new Deployment
    }
    instance.ca = fields.ca
    instance.type = fields.type
    instance.email = fields.email
    instance.domainName = fields.domainName
    instance.uri = uri
    instance.domains = fields.domains
    instance.provider = fields.provider
    instance.config = fields.config
    return instance
  }
}
