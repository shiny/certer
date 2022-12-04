import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Account extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public email: string

  @column()
  public ca: string

  @column()
  public type: "staging" | "production"

  @column({
    consume: (value: string) => JSON.parse(value)
  })
  public jwk: string

  @column()
  public account_url: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  /**
   * find the unique account
   * @param param0.email
   * @param param0.ca Authority name
   * @param param0.type staging or production
   * @returns null or Account
   */
  public static async findUnique({ email, ca, type }: Pick<Account, "email" | "ca" | "type">) {
    return Account.query()
      .where("email", email)
      .where("ca", ca)
      .where("type", type)
      .first()
  }
}
