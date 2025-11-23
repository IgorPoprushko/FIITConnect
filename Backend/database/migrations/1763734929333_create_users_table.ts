import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.string('email').notNullable().unique()
      table.string('password_hash').notNullable()
      table.string('first_name').notNullable()
      table.string('last_name').notNullable()
      table.string('nickname').notNullable().unique()
      table
        .uuid('setting_id')
        .references('id')
        .inTable('settings')
        .onDelete('CASCADE')
        .notNullable()

      table.timestamp('last_seen_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now()).notNullable()
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now()).notNullable()

      table.index(['nickname'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
