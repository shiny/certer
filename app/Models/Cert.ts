import { DateTime } from 'luxon'
import { BaseModel, column, hasOne, HasOne } from '@ioc:Adonis/Lucid/Orm'
import CertOrder from './CertOrder'
import { Order, Ca, createEcdsaCsr } from 'handyacme'
type Alg = "ECDSA" | "RSA"
export function isAlg(alg: string): alg is Alg {
  return ["ECDSA", "RSA" ].includes(alg)
}

export default class Cert extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column()
  public ca: string
  
  @column()
  public type: string

  @column()
  public email: string

  @column({
    prepare: value => JSON.stringify(value)
  })
  public domains: string[]
  
  @column()
  public certOrderId:number

  @column()
  public csr:string

  @column()
  public cert:string

  @column()
  public key:string

  @column()
  public alg: Alg
  
  @column.dateTime()
  public expiredAt: DateTime

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @hasOne(() => CertOrder, {
    localKey: 'certOrderId',
    foreignKey: 'id'
  })
  public order: HasOne<typeof CertOrder>

  public static async createFromOrder(order: CertOrder) {
    const cert = new Cert
    const { privateKey, csr } = await createEcdsaCsr(order.domains, "pem")
    cert.name = order.name
    cert.ca = order.ca
    cert.type = order.type
    cert.email = order.email
    cert.domains = order.domains
    cert.certOrderId = order.id
    cert.csr = csr
    cert.key = privateKey
    cert.alg = "ECDSA"
    cert.expiredAt = order.expiredAt
    return cert
  }

  async finalize(acmeClient: Ca) {
    const order = await CertOrder.findOrFail(this.certOrderId)
    const acmeOrder = await Order.restore(acmeClient, order.orderUrl)
    // order.certificateUrl = 
    const result = await acmeOrder.finalize(this.csr)
    return result
  }

  async download(acmeClient: Ca) {
    const order = await CertOrder.findOrFail(this.certOrderId)
    const acmeOrder = new Order(acmeClient)
    const certContent = await acmeOrder.downloadCertification(order.certificateUrl)
    this.cert = certContent
  }

  async downloadSave(acmeClient: Ca) {
    await this.download(acmeClient)
    return this.save()
  }
}
