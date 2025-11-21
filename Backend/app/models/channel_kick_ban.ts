import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import User from '#models/user'
import Channel from '#models/channel'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class ChannelKickBan extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true, columnName: 'id' })
  declare id: string

  @column({ columnName: 'channel_id' })
  declare channelId: string

  @belongsTo(() => Channel, { foreignKey: 'channel_id' })
  declare channel: BelongsTo<typeof Channel>

  @column({ columnName: 'target_user_id' })
  declare targetUserId: string

  @belongsTo(() => User, { foreignKey: 'target_user_id' })
  declare targetUser: BelongsTo<typeof User>

  @column({ columnName: 'permanent' })
  declare permanent: boolean

  @column({ columnName: 'reason' })
  declare reason: string | null

  @column.dateTime({ autoCreate: true, columnName: 'kicked_at' })
  declare kickedAt: DateTime

  @beforeCreate()
  static assignUuid(channelKickBan: ChannelKickBan) {
    channelKickBan.id = randomUUID()
  }
}
