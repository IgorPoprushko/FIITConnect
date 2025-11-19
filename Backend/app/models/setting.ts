import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { UserStatus } from 'App/enums/user_status.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { DateTime } from 'luxon'

export default class Setting extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare user_id: string

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column()
  declare status: UserStatus

  @column()
  declare notifications_enabled: boolean

  @column()
  declare direct_notifications_only: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
