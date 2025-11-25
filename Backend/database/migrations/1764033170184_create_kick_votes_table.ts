import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'kick_votes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.uuid('channel_id').references('id').inTable('channels').onDelete('CASCADE')

      table.uuid('target_user_id').references('id').inTable('users').onDelete('CASCADE')

      table.uuid('voter_user_id').references('id').inTable('users').onDelete('CASCADE')

      table.unique(['channel_id', 'target_user_id', 'voter_user_id'])

      table.timestamp('voted_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
