import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Channel from '#models/channel'
import Chat from '#models/chat'
import { randomUUID } from 'node:crypto'

export default class Message extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true, columnName: 'id' })
  declare id: string

  @column({ columnName: 'channel_id' })
  declare channelId: string | null

  @belongsTo(() => Channel, { foreignKey: 'channel_id' })
  declare channel: BelongsTo<typeof Channel>

  @column({ columnName: 'chat_id' })
  declare chatId: string | null

  @belongsTo(() => Chat, { foreignKey: 'chat_id' })
  declare chat: BelongsTo<typeof Chat>

  @column({ columnName: 'user_id' })
  declare userId: string

  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>

  @column({ columnName: 'content' })
  declare content: string

  @column({ columnName: 'reply_to_msg_id' })
  declare replyToMsgId: string | null

  @belongsTo(() => Message, { foreignKey: 'reply_to_msg_id' })
  declare replyToMessage: BelongsTo<typeof Message>

  @hasMany(() => Message, { foreignKey: 'reply_to_msg_id' })
  declare replies: HasMany<typeof Message>

  @column({ columnName: 'mentioned_user_ids' })
  declare mentionedUserIds: string | null

  @column({ columnName: 'is_deleted' })
  declare isDeleted: boolean

  @column({ columnName: 'delete_by_user_id' })
  declare deleteByUserId: string | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @beforeCreate()
  static assignUuid(message: Message) {
    message.id = randomUUID()
  }
}
