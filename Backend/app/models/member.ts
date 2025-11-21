import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import { MemberRole } from 'App/enums/member_role.js'
import User from '#models/user'
import Channel from '#models/channel'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Member extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true, columnName: 'id' })
  declare id: string

  @column({ columnName: 'user_id' })
  declare userId: string

  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>

  @column({ columnName: 'channel_id' })
  declare channelId: string

  @belongsTo(() => Channel, { foreignKey: 'channel_id' })
  declare channel: BelongsTo<typeof Channel>

  @column({ columnName: 'role' })
  declare role: MemberRole

  @column({ columnName: 'is_muted' })
  declare isMuted: boolean

  @column({ columnName: 'is_banned' })
  declare isBanned: boolean

  @column.dateTime({ autoCreate: true, columnName: 'joined_at' })
  declare joinedAt: DateTime

  @column.dateTime({ columnName: 'ban_until' })
  declare banUntil: DateTime | null

  @beforeCreate()
  static assignUuid(member: Member) {
    member.id = randomUUID()
  }
}
