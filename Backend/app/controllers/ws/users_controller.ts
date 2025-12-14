import { inject } from '@adonisjs/core'
import User from '#models/user'
import Member from '#models/member'
import Message from '#models/message'
import { Exception } from '@adonisjs/core/exceptions'
import type { AuthenticatedSocket } from '#services/ws'
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

  // 3. LIST_CHANNELS
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
      const unreadCountSubQuery = db
        .query()
        .select(db.raw('count(*)'))
        .from('messages')
        .whereColumn('messages.channel_id', 'members.channel_id')
        .whereColumn('messages.created_at', '>', 'members.joined_at')
        .andWhere('messages.user_id', '!=', user.id)
        .andWhere((query) => {
          query.whereExists((subQuery) => {
            subQuery
              .from('messages as lrm')
              .select('id')
              .whereColumn('lrm.id', 'members.last_read_message_id')
              .whereColumn('messages.created_at', '>', 'lrm.created_at')
          })
          query.orWhereNull('members.last_read_message_id')
        })
        .as('unread_count')

      const memberships = await Member.query()
        .where('userId', user.id)
        .preload('channel')
        .preload('lastReadMessage')
        .select(['members.*', unreadCountSubQuery])
        .exec()

      // 2. ОБРОБКА ТА МАПІНГ
      for (const m of memberships) {
        if (!m.channel || m.isBanned) continue

        const channel = m.channel!
        const unreadCount = m.$extras.unread_count ? Number.parseInt(m.$extras.unread_count, 10) : 0

        // Завантажуємо останнє повідомлення
        const lastMsg = await Message.query()
          .where('channelId', channel.id)
          .orderBy('createdAt', 'desc')
          .preload('user')
          .first()

        let lastMessageDto = null
        if (lastMsg) {
          const sentAtString =
            typeof lastMsg.createdAt === 'string'
              ? lastMsg.createdAt
              : ((lastMsg.createdAt as any)?.toISO?.() ?? new Date().toISOString())

          lastMessageDto = {
            content: lastMsg.content,
            sentAt: sentAtString,
            senderNick: lastMsg.user.nickname,
          }
        }

        channels.push({
          id: channel.id,
          name: channel.name,
          type: channel.type,
          description: channel.description,
          ownerUserId: channel.ownerUserId,
          unreadCount: unreadCount,
          isNew: Boolean(m.isNew),
          lastMessage: lastMessageDto,
        } as ChannelDto)
      }

      // 🔥 FIX: Сортуємо канали перед віддачею на клієнт (найновіші повідомлення зверху)
      channels.sort((a, b) => {
        const dateA = a.lastMessage?.sentAt ? new Date(a.lastMessage.sentAt).getTime() : 0
        const dateB = b.lastMessage?.sentAt ? new Date(b.lastMessage.sentAt).getTime() : 0
        return dateB - dateA
      })

      if (callback) callback({ status: 'ok', data: channels })
    } catch (error) {
      console.error(`[WS CRITICAL] [${userId}] LIST CHANNELS ERROR:`, error.message)
      if (callback)
        callback({ status: 'error', message: error.message || 'Unknown database error' })
    }
  }
}
