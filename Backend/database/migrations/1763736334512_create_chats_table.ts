import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'chats'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.uuid('user1_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
      table.uuid('user2_id').references('id').inTable('users').onDelete('CASCADE').notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['user1_id', 'user2_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
