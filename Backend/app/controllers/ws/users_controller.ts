import { inject } from '@adonisjs/core'
import User from '#models/user'
import Member from '#models/member'
import { Exception } from '@adonisjs/core/exceptions'
import type { AuthenticatedSocket } from '#services/ws'
// Message імпорт видалено (TS6133)
import { BaseResponse, UserStatus } from '#enums/global_enums'
import { UserDto, UserFullDto, UserSettingsDto } from '#contracts/user_contracts'
import { ChannelDto } from '#contracts/channel_contracts'
import db from '@adonisjs/lucid/services/db'

@inject()
export default class UsersController {
  // 1. PUBLIC_INFO
  public async getPublicInfo(
    socket: AuthenticatedSocket,
    payload: { nickname: string },
    callback?: (response: BaseResponse<UserDto>) => void
  ) {
    try {
      if (!payload.nickname) throw new Exception('Nickname is required')

      const user = await User.query().where('nickname', payload.nickname).preload('setting').first()

      if (!user) throw new Exception('User not found', { status: 404 })

      const data: UserDto = {
        id: user.id,
        nickname: user.nickname,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.setting?.status,
        lastSeenAt: user.lastSeenAt?.toISO() ?? null,
      }

      const response: BaseResponse<UserDto> = { status: 'ok', data }
      if (callback) callback(response)
      else socket.emit('user:public_info', data)
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  }

  // 2. FULL_INFO
  public async getFullInfo(
    socket: AuthenticatedSocket,
    callback?: (response: BaseResponse<UserFullDto>) => void
  ) {
    try {
      const user = socket.user!
      await user.load('setting')

      const settingsDto: UserSettingsDto = user.setting
        ? {
            status: user.setting.status,
            notificationsEnabled: Boolean(user.setting.notificationsEnabled),
            directNotificationsOnly: Boolean(user.setting.directNotificationsOnly),
          }
        : {
            status: UserStatus.ONLINE,
            notificationsEnabled: true,
            directNotificationsOnly: false,
          }

      const data: UserFullDto = {
        id: user.id,
        nickname: user.nickname,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        status: settingsDto.status,
        lastSeenAt: user.lastSeenAt?.toISO() ?? null,
        settings: settingsDto,
      }

      if (callback) callback({ status: 'ok', data })
      else socket.emit('user:full_info', data)
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  }

  // 3. LIST_CHANNELS (Виправлений та оптимізований метод)
  public async listChannels(
    socket: AuthenticatedSocket,
    callback?: (response: BaseResponse<ChannelDto[]>) => void
  ) {
    const userId = socket.user!.id
    console.log(`[WS DEBUG] [${userId}] Starting listChannels...`)

    try {
      const user = socket.user!
      const channels: ChannelDto[] = []

      // Створення будівельника підзапиту для обчислення непрочитаних повідомлень
      // 🔥 ВИКОРИСТАННЯ db.raw() та whereExists ДЛЯ ОБХОДУ ПРОБЛЕМ З JOIN 🔥
      const unreadCountSubQuery = db
        .query()
        .select(db.raw('count(*)'))
        .from('messages')

        // 1. Повідомлення належить поточному каналу членства
        .whereColumn('messages.channel_id', 'members.channel_id')

        // 2. Повідомлення має бути новішим, ніж коли користувач приєднався
        .whereColumn('messages.created_at', '>', 'members.joined_at')

        // 3. ФІКС: Перевірка на дату останнього прочитаного повідомлення через ID.
        // Ми перевіряємо, чи існує повідомлення (lrm) з датою, яка робить поточне повідомлення (messages) непрочитаним.
        .andWhere((query) => {
          query.whereExists((subQuery) => {
            subQuery
              .from('messages as lrm') // lrm = last read message
              .select('id')
              .whereColumn('lrm.id', 'members.last_read_message_id') // Зв'язок
              .whereColumn('messages.created_at', '>', 'lrm.created_at') // Повідомлення новіше, ніж дата lrm
          })
          // АБО: last_read_message_id ще не встановлено
          query.orWhereNull('members.last_read_message_id')
        })
        .as('unread_count')

      console.log(`[WS DEBUG] [${userId}] Subquery constructed. Executing main query...`)

      // 1. ОДИН ОПТИМІЗОВАНИЙ ЗАПИТ до БД
      const memberships = await Member.query()
        .where('userId', user.id)
        .preload('channel')
        .preload('lastReadMessage')
        .select(['members.*', unreadCountSubQuery])
        .exec()

      console.log(
        `[WS DEBUG] [${userId}] Query executed successfully. Found ${memberships.length} memberships.`
      )

      // 2. ОБРОБКА ТА МАПІНГ
      for (const m of memberships) {
        if (!m.channel || m.isBanned) continue

        const channel = m.channel!

        const unreadCount = m.$extras.unread_count ? Number.parseInt(m.$extras.unread_count, 10) : 0

        channels.push({
          id: channel.id,
          name: channel.name,
          type: channel.type,
          description: channel.description,
          ownerUserId: channel.ownerUserId,
          unreadCount: unreadCount,
          lastMessage: null,
        } as ChannelDto)
      }

      for (const channel of channels) {
        console.log(
          `[SPEC] [${userId}] Channel: ${channel.name}, Unread Count: ${channel.unreadCount}`
        )
      } // 3. ВІДПРАВКА ВІДПОВІДІ
      if (callback) callback({ status: 'ok', data: channels })

      console.log(
        `[WS DEBUG] [${userId}] ACK callback sent successfully. Loaded ${channels.length} channels for user ${user.nickname}`
      )
    } catch (error) {
      // Цей лог тепер має спрацьовувати ЛИШЕ на справжніх помилках SQL/коду
      console.error(`[WS CRITICAL] [${userId}] LIST CHANNELS ERROR:`, error.message)

      if (callback)
        callback({ status: 'error', message: error.message || 'Unknown database error' })
    }
  }
}
