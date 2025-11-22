import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column, hasOne } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import Setting from '#models/setting'
import type { HasOne } from '@adonisjs/lucid/types/relations'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  static selfAssignPrimaryKey = true
  static accessTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '30 days',
    prefix: 'oat_',
    table: 'auth_access_tokens',
    type: 'auth_token',
    tokenSecretLength: 40,
  })

  @column({ isPrimary: true, columnName: 'id' })
  declare id: string

  @column({ columnName: 'email' })
  declare email: string

  @column({ columnName: 'password_hash', serializeAs: null })
  declare passwordHash: string

  @column({ columnName: 'first_name' })
  declare firstName: string

  @column({ columnName: 'last_name' })
  declare lastName: string

  @column({ columnName: 'nickname' })
  declare nickname: string

  @column({ columnName: 'setting_id' })
  declare settingId: string

  @hasOne(() => Setting, { foreignKey: 'user_id' })
  declare setting: HasOne<typeof Setting>

  @column.dateTime({ columnName: 'last_seen_at' })
  declare lastSeenAt: DateTime | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(user: User) {
    user.id = randomUUID()
  }
}
