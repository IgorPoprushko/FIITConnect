import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Channel from '#models/channel'
import User from '#models/user'

export default class KickVote extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column({ columnName: 'channel_id' })
  declare channelId: string

  @belongsTo(() => Channel, { foreignKey: 'channelId' })
  declare channel: BelongsTo<typeof Channel>

  @column({ columnName: 'target_user_id' })
  declare targetUserId: string

  @belongsTo(() => User, { foreignKey: 'targetUserId' })
  declare targetUser: BelongsTo<typeof User>

  @column({ columnName: 'voter_user_id' })
  declare voterUserId: string

  @belongsTo(() => User, { foreignKey: 'voterUserId' })
  declare voterUser: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true, columnName: 'voted_at' })
  declare votedAt: DateTime

  @beforeCreate()
  static assignUuid(kickVote: KickVote) {
    kickVote.id = randomUUID()
  }
}
