import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'chat_drafts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable()
      table
        .uuid('channel_id')
        .references('id')
        .inTable('channels')
        .onDelete('CASCADE')
        .notNullable()
      table.uuid('chat_id').references('id').inTable('chats').onDelete('CASCADE').nullable()

      table.text('content').notNullable()

      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['user_id', 'channel_id', 'chat_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
