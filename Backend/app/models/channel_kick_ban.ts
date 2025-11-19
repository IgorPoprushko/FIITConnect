import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import User from '#models/user'
import Channel from '#models/channel'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class ChannelKickBan extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare channelId: string

  @belongsTo(() => Channel)
  declare channel: BelongsTo<typeof Channel>

  @column()
  declare targetUserId: string

  @belongsTo(() => User)
  declare targetUser: BelongsTo<typeof User>

  @column()
  declare permanent: boolean

  @column()
  declare reason: string | null

  @column.dateTime({ autoCreate: true })
  declare kickedAt: DateTime

  @beforeCreate()
  static assignUuid(channelKickBan: ChannelKickBan) {
    channelKickBan.id = randomUUID()
  }
}
