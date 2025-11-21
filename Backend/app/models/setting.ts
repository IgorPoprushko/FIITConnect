import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { UserStatus } from 'App/enums/user_status.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

export default class Setting extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true, columnName: 'id' })
  declare id: string

  @column({ columnName: 'user_id' })
  declare userId: string

  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>

  @column({ columnName: 'status' })
  declare status: UserStatus

  @column({ columnName: 'notifications_enabled' })
  declare notificationsEnabled: boolean

  @column({ columnName: 'direct_notifications_only' })
  declare directNotificationsOnly: boolean

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(setting: Setting) {
    setting.id = randomUUID()
  }
}
