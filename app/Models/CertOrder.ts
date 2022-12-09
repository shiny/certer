import { DateTime } from 'luxon'
import {
  BaseModel,
  column,
  hasMany,
  HasMany,
 } from '@ioc:Adonis/Lucid/Orm'
 import Database from '@ioc:Adonis/Lucid/Database'
 import OrderChallenge from './OrderChallenge'
 import type { Account, Authorization, Order } from "handyacme"

type OrderCreateOptions = {
  order: Order,
  account: Account,
  authorizations: Authorization[]
}

export default class CertOrder extends BaseModel {
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
  public orderUrl: string

  @column()
  public status: string

  @column.dateTime()
  public expiredAt: DateTime

  @hasMany(() => OrderChallenge, {
    foreignKey: 'certOrderId',
  })
  public challenges: HasMany<typeof OrderChallenge>
  
  @column()
  public finalizeUrl: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  public static async isExists({ ca, type, name, email }) {
    const existsOrder = await CertOrder.findExistingOne({ ca, type, name, email })
    return !!existsOrder
  }

  public static async findExistingOne({ ca, type, name, email }) {
    const records = await CertOrder.query()
      .where('ca', ca)
      .where('type', type)
      .where('email', email)
      .where('name', name)
      .whereIn('status', [
        "pending",
        "ready",
        "processing",
        "valid",
      ])
    return records?.[0]
  }

  public static async createCertOrder({ order, account, authorizations }: OrderCreateOptions) {


    await Database.transaction(async (trx) => {

      const certOrder = new CertOrder()

      certOrder.useTransaction(trx)
      certOrder.email = account.email
      certOrder.ca = account.ca.name
      // the name is the first domain name in order
      certOrder.name = order.domains[0]
      certOrder.orderUrl = order.url
      certOrder.domains = order.domains
      certOrder.expiredAt = order.data.expires
      certOrder.type = account.ca.env;
      certOrder.finalizeUrl = order.finalizeUrl
      certOrder.status = order.status
      await certOrder.save()

      const challenges = await Promise.all(authorizations.map(async item => {

        if (item.identifierType !== 'dns') {
          throw new Error(`Only identifier type dns is supported`)
        }

        return {
          certOrderId: certOrder.id,
          identifierType: item.identifierType as "dns",
          identifierValue: item.identifierValue,
          type: item.challengeDns.type,
          status: item.challengeDns.status,
          token: item.challengeDns.token,
          signKey: await item.challengeDns.sign(),
          isWildcard: item.isWildcard,
          challengeUrl: item.challengeDns.url,
          authorizationUrl: item.url,
          authorizationStatus: item.status,
          expiredAt: new DateTime(item.expiresAt),
        }
      }))
      await certOrder.related('challenges').createMany(challenges)
    })
  }
}
