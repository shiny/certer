import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'cert_orders'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('name')

      table.string('ca')
      table.enum("type", [
        "staging",
        "production"
      ])
      table.string('dns_cred_name')
      table.string('email')
      table.string('domains')
      table.string('order_url')
      table.string('certificate_url')
      table.enum("status", [
        "pending",
        "ready",
        "processing",
        "valid",
        "invalid",
      ])
      table.timestamp('expired_at', { useTz: true })
      table.string('finalize_url')
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
