import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'order_challenges'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('cert_order_id')
        .unsigned()
        .references('cert_orders.id')
        .onDelete('CASCADE')
      table.enum('identifier_type', ['dns'])
      table.string('identifier_value')
      table.enum('type', [
        "dns-01"
      ])
      table.boolean('is_wildcard')
      table.string('status')
      table.string('token')
      table.string('sign_key')
      table.string('challenge_url')
      table.string('authorization_url')
      table.string('authorization_status')
      table.timestamp('expired_at', { useTz: true })
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
