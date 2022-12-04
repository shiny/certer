import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'accounts'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string("ca").notNullable()
      
      table.enum("type", [
        "staging",
        "production"
      ])
      .defaultTo("production")

      table.string('email')
      table.string('account_url')

      table.string('jwk')
      // unique index
      table.unique(['ca', 'type', 'email'])
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
