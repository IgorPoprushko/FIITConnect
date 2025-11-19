import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Channel from '#models/channel'
import { randomUUID } from 'node:crypto'

export default class Message extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare channelId: string

  @belongsTo(() => Channel)
  declare channel: BelongsTo<typeof Channel>

  @column()
  declare userId: string

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column()
  declare content: string

  @column()
  declare replyToMsgId: string | null

  @belongsTo(() => Message, { foreignKey: 'reply_to_msg_id' })
  declare replyToMessage: BelongsTo<typeof Message>

  @hasMany(() => Message, { foreignKey: 'reply_to_msg_id' })
  declare replies: HasMany<typeof Message>

  @column()
  declare mentionedUserIds: string | null

  @column()
  declare isDeleted: boolean

  @column()
  declare deleteByUserId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @beforeCreate()
  static assignUuid(message: Message) {
    message.id = randomUUID()
  }
}
