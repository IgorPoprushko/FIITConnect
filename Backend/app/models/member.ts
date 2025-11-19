import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import { MemberRole } from 'App/enums/member_role.js'
import User from '#models/user'
import Channel from '#models/channel'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Member extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column()
  declare channelId: string

  @belongsTo(() => Channel)
  declare channel: BelongsTo<typeof Channel>

  @column()
  declare role: MemberRole

  @column()
  declare isMuted: boolean

  @column()
  declare isBanned: boolean

  @column.dateTime({ autoCreate: true })
  declare joinedAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare banUntil: DateTime | null

  @beforeCreate()
  static assignUuid(member: Member) {
    member.id = randomUUID()
  }
}
