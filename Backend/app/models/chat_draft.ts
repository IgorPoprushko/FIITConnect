import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Channel from '#models/channel'
import Chat from '#models/chat'
import User from '#models/user'

export default class ChatDraft extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare channelId: string | null

  @belongsTo(() => Channel)
  declare channel: BelongsTo<typeof Channel>

  @column()
  declare chatId: string | null

  @belongsTo(() => Chat)
  declare chat: BelongsTo<typeof Chat>

  @column()
  declare userId: string

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column()
  declare content: string

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(chatDraft: ChatDraft) {
    chatDraft.id = randomUUID()
  }
}
