import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Chat extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true, columnName: 'id' })
  declare id: string

  @column({ columnName: 'user1_id' })
  declare user1Id: string

  @belongsTo(() => User, { foreignKey: 'user1_id' })
  declare user1: BelongsTo<typeof User>

  @column({ columnName: 'user2_id' })
  declare user2Id: string

  @belongsTo(() => User, { foreignKey: 'user2_id' })
  declare user2: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(chat: Chat) {
    chat.id = randomUUID()
  }
}
