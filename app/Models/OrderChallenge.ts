import { DateTime } from 'luxon'
import {
  BaseModel,
  column,
  belongsTo,
  BelongsTo
} from '@ioc:Adonis/Lucid/Orm'
import CertOrder from './CertOrder'
import type { Ca } from "handyacme"

export default class OrderChallenge extends BaseModel {
  @column({ isPrimary: true })
  public id: number
  
  @column()
  public certOrderId:number

  @column()
  public identifierType: "dns"

  /**
   * domain name
   */
  @column()
  public identifierValue: string

  /**
   * Chanllenge type
   */
  @column()
  public type: "dns-01" | "http-01" | "tls-alpn-01"

  /**
   * Chanllenge status
   */
  @column()
  public status: string

  @column()
  public token: string

  /**
   * dns record for dns-01
   * txt content for http-01
   */
  @column()
  public signKey: string
  

  @column()
  public isWildcard: boolean

  /**
   * Request this url after finish
   */
  @column()
  public challengeUrl: string

  /**
   * Query authorization status after finish
   */
  @column()
  public authorizationUrl: string

  @column()
  public authorizationStatus: string

  /**
   * Authorization expired at
   */
  @column.dateTime()
  public expiredAt: DateTime

  @belongsTo(() => CertOrder)
  public order: BelongsTo<typeof CertOrder>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  /**
   * 
   * @param acmeClient 
   * @returns true on valid, false on pending or processing
   */
  async isValidAndSave(acmeClient: Ca) {
    const authorization = await acmeClient.restoreAuthorization(this.authorizationUrl)

    if (this.authorizationStatus !== authorization.status) {
      this.authorizationStatus = authorization.status
      await this.save()
    }

    if (authorization.isValid) {
      return true
    } 
    if (authorization.isPending) {
      const challenge = await acmeClient.restoreChallenge(this.challengeUrl)
      if (this.status !== challenge.status) {
        this.status = challenge.status
        await this.save()
      }
      if (challenge.isValid) {
        return true
      }
      if (challenge.isProcessing || challenge.isPending) {
        return false
      }
      if (challenge.isInvalid) {
        throw new Error(`Challenge is invalid`)
      }
      throw new Error(`Unknow challenge status ${challenge.status}`)
    }
    throw new Error(`Authorization status is ${authorization.status}`)
  }
}
