import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').nullable()
      table.integer('status').notNullable().defaultTo(1)
      table.boolean('notifications_enabled').notNullable().defaultTo(true)
      table.boolean('direct_notifications_only').notNullable().defaultTo(false)

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now()).notNullable()
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now()).notNullable()

      table.index('user_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
