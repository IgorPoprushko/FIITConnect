import { inject } from '@adonisjs/core'
import User from '#models/user'
import Member from '#models/member'
import { Exception } from '@adonisjs/core/exceptions'
import { updateSettingsValidator } from '#validators/user'
import type { AuthenticatedSocket } from '#services/ws'
import Ws from '#services/ws'
import { BaseResponse } from '#enums/response_type' // Імпорт UserStatus
import { UserStatus } from '#enums/user_status'
import {
  UserDto,
  UserFullDto,
  UserSettingsDto,
  UpdateSettingsPayload,
} from '#contracts/user_contracts'
import { ChannelDto } from '#contracts/channel_contracts'

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

  // 3. LIST_CHANNELS
  public async listChannels(
    socket: AuthenticatedSocket,
    callback?: (response: BaseResponse<ChannelDto[]>) => void
  ) {
    try {
      const user = socket.user!
      const memberships = await Member.query().where('userId', user.id).preload('channel').exec()

      const channels: ChannelDto[] = memberships
        .filter((m) => m.channel && !m.isBanned)
        .map((m) => ({
          id: m.channel.id,
          name: m.channel.name,
          type: m.channel.type,
          description: m.channel.description,
          ownerUserId: m.channel.ownerUserId,
          unreadCount: 0,
          lastMessage: null,
        }))

      if (callback) callback({ status: 'ok', data: channels })
      else socket.emit('user:channels_list', channels)
    } catch (error) {
      if (callback) callback({ status: 'error', message: error.message })
    }
  }

  // 4. CHANGE_SETTINGS
  public async changeSettings(
    socket: AuthenticatedSocket,
    payload: UpdateSettingsPayload,
    callback?: (response: BaseResponse<UserSettingsDto>) => void
  ) {
    try {
      const user = socket.user!
      const validPayload = await updateSettingsValidator.validate(payload)

      await user.load('setting')
      const setting = user.setting

      if (!setting) throw new Exception('Settings not initialized')

      setting.merge(validPayload)
      await setting.save()

      const settingsDto: UserSettingsDto = {
        status: setting.status,
        notificationsEnabled: Boolean(setting.notificationsEnabled),
        directNotificationsOnly: Boolean(setting.directNotificationsOnly),
      }

      Ws.getIo().to(user.id).emit('user:settings_updated', settingsDto)

      if (callback) callback({ status: 'ok', data: settingsDto })
    } catch (error) {
      const message = error.messages ? JSON.stringify(error.messages) : error.message
      if (callback) callback({ status: 'error', message })
    }
  }
}
