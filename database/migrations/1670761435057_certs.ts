import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'certs'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('name')
      table.string('ca')
      table.enum("type", [
        "staging",
        "production"
      ])
      table.string('email')
      table.jsonb('domains')
      
      table.integer('cert_order_id')
      table.string('dns_cred_name')
      table.text('csr', 'mediumtext')

      table.text('cert', 'mediumtext')
      table.text('key', 'mediumtext')
      table.enum('alg', [
        'ECDSA',
        'RSA'
      ])
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
