import { DateTime } from 'luxon'
import { BaseModel, column, hasOne, HasOne } from '@ioc:Adonis/Lucid/Orm'
import CertOrder from './CertOrder'
import { Order, Ca, createEcdsaCsr } from 'handyacme'
import { X509Certificate } from "node:crypto"
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
  public dnsCredName: string

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
    cert.dnsCredName = order.dnsCredName
    cert.csr = csr
    cert.key = privateKey
    cert.alg = "ECDSA"
    return cert
  }

  async finalize(acmeClient: Ca) {
    const order = await CertOrder.findOrFail(this.certOrderId)
    const acmeOrder = await Order.restore(acmeClient, order.orderUrl)
    const result = await acmeOrder.finalize(this.csr)
    return result
  }

  async download(acmeClient: Ca) {
    const order = await CertOrder.findOrFail(this.certOrderId)
    const acmeOrder = new Order(acmeClient)
    const certContent = await acmeOrder.downloadCertification(order.certificateUrl)
    const x509cert = new X509Certificate(certContent)
    const validTo = new Date(x509cert.validTo)
    this.expiredAt = DateTime.fromJSDate(validTo)
    this.cert = certContent
  }

  async downloadSave(acmeClient: Ca) {
    await this.download(acmeClient)
    return this.save()
  }
}
