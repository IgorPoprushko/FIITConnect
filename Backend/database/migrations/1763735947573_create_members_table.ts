import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'members'

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

      table.string('role').notNullable()
      table.boolean('is_muted').notNullable().defaultTo(false)
      table.boolean('is_banned').notNullable().defaultTo(false)

      table.timestamp('joined_at').notNullable().defaultTo(this.now())
      table.timestamp('ban_until').nullable()

      table.unique(['user_id', 'channel_id'])
      table.check(`role IN ('admin','moderator','member')`)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
