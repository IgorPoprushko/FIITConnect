import { inject } from '@adonisjs/core'
import User from '#models/user'
import Member from '#models/member'
import { Exception } from '@adonisjs/core/exceptions'
import type { AuthenticatedSocket } from '#services/ws'
// import Message from '#models/message' // Видалено: ця модель більше не потрібна
import { BaseResponse, UserStatus } from '#enums/global_enums'
import { UserDto, UserFullDto, UserSettingsDto } from '#contracts/user_contracts'
import { ChannelDto } from '#contracts/channel_contracts'
import db from '@adonisjs/lucid/services/db' // Імпорт Database

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

      // FIX: Якщо setting === null, ми не можемо брати user.setting.status.
      // Ми повинні задати дефолтні значення вручну.
      const settingsDto: UserSettingsDto = user.setting
        ? {
            status: user.setting.status,
            notificationsEnabled: Boolean(user.setting.notificationsEnabled),
            directNotificationsOnly: Boolean(user.setting.directNotificationsOnly),
          }
        : {
            status: UserStatus.ONLINE, // Дефолтне значення
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
    try {
      const user = socket.user!
      const channels: ChannelDto[] = []

      // Створення будівельника підзапиту для обчислення непрочитаних повідомлень
      const unreadCountSubQuery = db
        .query()
        .select(db.raw('count(*)')) // SELECT COUNT(*)
        .from('messages')
        .whereColumn('messages.channel_id', 'members.channel_id') // Зв'язок
        .andWhere((query) => {
          // Виправлення помилок 7006 (implicit any)
          query.whereColumn('messages.created_at', '>', 'members.joined_at')

          // Умова, що враховує lastReadMessage
          query.andWhere((subQuery) => {
            subQuery
              .whereColumn('messages.created_at', '>', 'last_read_message.created_at')
              .orWhereNull('last_read_message.created_at')
          })
        })
        .as('unread_count') // Записуємо результат в нове поле

      // 1. ОДИН ОПТИМІЗОВАНИЙ ЗАПИТ до БД
      const memberships = await Member.query()
        .where('userId', user.id)
        .preload('channel')
        .preload('lastReadMessage')
        // Додаємо підзапит як окремий стовпець
        .select([
          'members.*', // Обов'язково додайте всі стовпці, якщо ви використовуєте .select
          unreadCountSubQuery,
        ])
        .exec()

      // 2. ОБРОБКА ТА МАПІНГ
      for (const m of memberships) {
        if (!m.channel || m.isBanned) continue

        const channel = m.channel!

        // Витягуємо unreadCount з агрегованого поля $extras
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

      // 3. ВІДПРАВКА ВІДПОВІДІ
      if (callback) callback({ status: 'ok', data: channels })
      else socket.emit('user:channels_list', channels)

      const userNickname = user.nickname || 'Unknown'
      console.log(`[WS] Loaded ${channels.length} channels for user ${userNickname}`)
    } catch (error) {
      console.error('LIST CHANNELS ERROR:', error)
      if (callback) callback({ status: 'error', message: error.message })
    }
  }
}
