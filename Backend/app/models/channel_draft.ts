import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Channel from '#models/channel'
import User from '#models/user'

export default class ChannelDraft extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true, columnName: 'id' })
  declare id: string

  @column({ columnName: 'channel_id' })
  declare channelId: string

  @belongsTo(() => Channel, { foreignKey: 'channel_id' })
  declare channel: BelongsTo<typeof Channel>

  @column({ columnName: 'user_id' })
  declare userId: string

  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>

  @column({ columnName: 'content' })
  declare content: string

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(channelDraft: ChannelDraft) {
    channelDraft.id = randomUUID()
  }
}
