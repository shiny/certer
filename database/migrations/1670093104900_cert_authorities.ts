import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'cert_authorities'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string("ca").notNullable()
      
      table.enum("type", [
        "staging",
        "production"
      ])
      .defaultTo("production")
      
      table.string("directory_url")
      table.string("new_nonce")
      table.string("new_account")
      table.string("new_order")
      table.string("revoke_cert")
      table.string("key_change")
      table.boolean("external_account_required")
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
