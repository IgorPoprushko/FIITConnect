import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { UserStatus } from 'App/enums/user_status.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

export default class Setting extends BaseModel {
  static selfAssignPrimaryKey = true
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column()
  declare status: UserStatus

  @column()
  declare notificationsEnabled: boolean

  @column()
  declare directNotificationsOnly: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(setting: Setting) {
    setting.id = randomUUID()
  }
}
