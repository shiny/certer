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
  public directoryUrl: string

  @column()
  public newNonce: string
  
  @column()
  public newAccount: string
  
  @column()
  public newOrder: string
  
  @column()
  public revokeCert: string
  
  @column()
  public keyChange: string
  
  @column()
  public externalAccountRequired: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
