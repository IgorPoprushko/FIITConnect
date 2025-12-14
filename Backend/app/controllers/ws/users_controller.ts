import { inject } from '@adonisjs/core'
import User from '#models/user'
import Member from '#models/member'
import Message from '#models/message'
import Setting from '#models/setting'
import { Exception } from '@adonisjs/core/exceptions'
import type { AuthenticatedSocket } from '#services/ws'
import Ws from '#services/ws'
import { BaseResponse, UserStatus } from '#enums/global_enums'
import {
  UserDto,
  UserFullDto,
  UserSettingsDto,
  UpdateSettingsPayload,
  UpdateProfilePayload,
} from '#contracts/user_contracts'
import { ChannelDto } from '#contracts/channel_contracts'
import db from '@adonisjs/lucid/services/db'

@inject()
export default class UsersController {
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
        status: user.setting?.status ?? UserStatus.OFFLINE,
        lastSeenAt: user.lastSeenAt?.toISO() ?? null,
      }

      const response: BaseResponse<UserDto> = { status: 'ok', data }
      if (callback) callback(response)
      else socket.emit('user:public_info', data)
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  }

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
        settings: settingsDto,
        status: settingsDto.status,
        lastSeenAt: user.lastSeenAt?.toISO() ?? null,
      }

      if (callback) callback({ status: 'ok', data })
      else socket.emit('user:full_info', data)
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  }

  public async listChannels(
    socket: AuthenticatedSocket,
    callback?: (response: BaseResponse<ChannelDto[]>) => void
  ) {
    const userId = socket.user!.id
    console.log(`[WS DEBUG] [${userId}] Starting listChannels...`)

    try {
      const user = socket.user!
      const channels: ChannelDto[] = []

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

      for (const m of memberships) {
        if (!m.channel || m.isBanned) continue

        const channel = m.channel!
        const unreadCount = m.$extras.unread_count ? Number.parseInt(m.$extras.unread_count, 10) : 0

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

  public async updateSettings(
    socket: AuthenticatedSocket,
    payload: UpdateSettingsPayload,
    callback?: (response: BaseResponse<UserSettingsDto>) => void
  ) {
    const user = socket.user!

    try {
      const setting = await Setting.updateOrCreate(
        { userId: user.id },
        {
          ...(payload.status !== undefined ? { status: payload.status } : {}),
          ...(payload.notificationsEnabled !== undefined
            ? { notificationsEnabled: payload.notificationsEnabled }
            : {}),
          ...(payload.directNotificationsOnly !== undefined
            ? { directNotificationsOnly: payload.directNotificationsOnly }
            : {}),
        }
      )

      if (payload.status === UserStatus.OFFLINE) {
        const memberships = await Member.query().where('userId', user.id).exec()
        memberships.forEach((m) => socket.leave(m.channelId))
        console.log(`[WS] User ${user.nickname} went OFFLINE. Left all channels.`)
      }

      if (payload.status !== undefined && payload.status !== UserStatus.OFFLINE) {
        const memberships = await Member.query().where('userId', user.id).preload('channel').exec()
        memberships.forEach((m) => {
          if (m.channel && !m.isBanned) socket.join(m.channelId)
        })
        console.log(`[WS] User ${user.nickname} is back ONLINE. Joined channels.`)
      }

      const responseDto: UserSettingsDto = {
        status: setting.status,
        notificationsEnabled: Boolean(setting.notificationsEnabled),
        directNotificationsOnly: Boolean(setting.directNotificationsOnly),
      }
      if (payload.status !== undefined) {
        const memberships = await Member.query().where('userId', user.id).select('channelId').exec()
        const channelIds = memberships.map((m) => m.channelId)

        Ws.getIo().to(channelIds).emit('user:status:changed', {
          userId: user.id,
          status: payload.status,
        })
      }

      if (callback) callback({ status: 'ok', data: responseDto })

      socket.emit('user:settings_updated', responseDto)
    } catch (error) {
      console.error('[WS] Update settings error:', error)
      if (callback) callback({ status: 'error', message: error.message })
    }
  }

  public async updateProfile(
    socket: AuthenticatedSocket,
    payload: UpdateProfilePayload,
    callback?: (response: BaseResponse<UserFullDto>) => void
  ) {
    const user = socket.user!
    try {
      if (payload.firstName !== undefined) user.firstName = payload.firstName
      if (payload.lastName !== undefined) user.lastName = payload.lastName
      if (payload.email !== undefined) user.email = payload.email

      await user.save()

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
        settings: settingsDto,
        status: settingsDto.status,
        lastSeenAt: user.lastSeenAt?.toISO() ?? null,
      }

      if (callback) callback({ status: 'ok', data })
    } catch (error) {
      console.error('[WS] Update profile error:', error)
      if (callback) callback({ status: 'error', message: error.message })
    }
  }
}
