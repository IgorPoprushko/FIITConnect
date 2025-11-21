import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'channel_kick_bans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table
        .uuid('channel_id')
        .notNullable()
        .references('id')
        .inTable('channels')
        .onDelete('CASCADE')
      table
        .uuid('target_user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.boolean('permanent').defaultTo(false).notNullable()
      table.string('reason').nullable()

      table.timestamp('kicked_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['channel_id', 'target_user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
