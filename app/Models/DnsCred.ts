import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class DnsCred extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column()
  public name: string

  @column()
  public provider: string

  @column()
  public creds: string

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  /**
   * When there is only one cred
   * make it the default
   * @returns 
   */
  public static async hasDefaultCred() {
    const results = await DnsCred.query().count('* as total')
    return results[0].$extras.total === '1'
  }
}
