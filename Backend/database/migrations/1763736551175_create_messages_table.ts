import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table
        .uuid('channel_id')
        .notNullable()
        .references('id')
        .inTable('channels')
        .onDelete('CASCADE')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.text('content').notNullable()
      table
        .uuid('reply_to_msg_id')
        .nullable()
        .references('id')
        .inTable('messages')
        .onDelete('SET NULL')
      table.text('mentioned_user_ids').nullable()
      table.boolean('is_deleted').notNullable().defaultTo(false)
      table.uuid('delete_by_user_id').nullable().references('id').inTable('users')

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now()).index()

      table.index('channel_id', 'messages_channel_id_index')
      table.index('user_id', 'messages_user_id_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
