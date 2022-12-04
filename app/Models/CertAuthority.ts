import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class CertAuthority extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public ca: string

  @column()
  public type: "staging" | "production"

  @column()
  public directory_url: string

  @column()
  public new_nonce: string
  
  @column()
  public new_account: string
  
  @column()
  public new_order: string
  
  @column()
  public revoke_cert: string
  
  @column()
  public key_change: string
  
  @column()
  public external_account_required: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
