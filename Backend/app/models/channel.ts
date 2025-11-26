import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import User from '#models/user'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { ChannelType } from '#enums/channel_type'
import Member from './member.js'

export default class Channel extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true, columnName: 'id' })
  declare id: string

  @column({ columnName: 'name' })
  declare name: string

  @column({ columnName: 'description' })
  declare description: string | null

  @column({ columnName: 'type' })
  declare type: ChannelType

  @column({ columnName: 'owner_user_id' })
  declare ownerUserId: string

  @belongsTo(() => User, { foreignKey: 'ownerUserId' })
  declare owner: BelongsTo<typeof User>

  // Dont send if exist requsest info channel
  @hasMany(() => Member, { foreignKey: 'channelId' })
  declare members: HasMany<typeof Member>

  @column.dateTime({ columnName: 'last_message_at' })
  declare lastMessageAt: DateTime | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(channel: Channel) {
    channel.id = randomUUID()
  }
}
