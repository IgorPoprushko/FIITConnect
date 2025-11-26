import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { inject } from '@adonisjs/core'
import Ws from '#services/ws'
import app from '@adonisjs/core/services/app'
import {
  updateStatusValidator,
  updateSettingsValidator,
  getUserByNicknameValidator,
} from '#validators/user'
import {
  UserResponse,
  UserStatusResponse,
  SettingsResponse,
  UpdateStatusPayload,
  UpdateSettingsPayload,
  UserStatusUpdateEvent,
  GetUserByNicknamePayload,
} from '#contracts/users_contracts'

@inject()
export default class UsersController {
  private async getWsService(): Promise<Ws> {
    return app.container.make(Ws)
  }

  async getUserByNickname({ auth, request, response }: HttpContext) {
    if (!auth.user) {
      return response.unauthorized()
    }
    const { nickname } = (await request.validateUsing(
      getUserByNicknameValidator
    )) as GetUserByNicknamePayload

    const user = await User.query().where('nickname', nickname).preload('setting').first()

    if (!user) {
      return response.notFound({ errors: [{ message: 'User not found' }] })
    }

    return response.ok({ user: user.serialize() } as UserResponse)
  }

  async getMyStatus({ auth, request, response }: HttpContext) {
    if (!auth.user) {
      return response.unauthorized()
    }
    const { nickname } = (await request.validateUsing(
      getUserByNicknameValidator
    )) as GetUserByNicknamePayload

    const user = await User.query()
      .where('nickname', nickname)
      .preload('setting', (settingQuery) => {
        settingQuery.select('status')
      })
      .first()

    if (!user || !user.setting) {
      return response.notFound({ errors: [{ message: 'User or status not found' }] })
    }

    return response.ok({ status: user.setting.status } as UserStatusResponse)
  }

  async getMySettings({ auth, response }: HttpContext) {
    if (!auth.user) {
      return response.unauthorized()
    }

    await auth.user.load('setting')

    if (!auth.user.setting) {
      return response.notFound({ errors: [{ message: 'User settings not found' }] })
    }

    return response.ok({ setting: auth.user.setting.serialize() } as SettingsResponse)
  }

  async updateMyStatus({ auth, request, response }: HttpContext) {
    if (!auth.user) {
      return response.unauthorized()
    }

    const { status } = (await request.validateUsing(updateStatusValidator)) as UpdateStatusPayload

    await auth.user.load('setting')
    const userSetting = auth.user.setting

    if (!userSetting) {
      return response.internalServerError({
        errors: [{ message: 'User settings not initialized' }],
      })
    }

    const oldStatus = userSetting.status
    userSetting.status = status
    await userSetting.save()

    if (oldStatus !== status) {
      const wsService = await this.getWsService()
      const eventPayload: UserStatusUpdateEvent = {
        userId: auth.user.id,
        status: status,
      }

      wsService.io?.emit('user:status_updated', eventPayload)
    }

    return response.ok({ setting: userSetting.serialize() } as SettingsResponse)
  }

  async updateMySettings({ auth, request, response }: HttpContext) {
    if (!auth.user) {
      return response.unauthorized()
    }

    const payload = (await request.validateUsing(updateSettingsValidator)) as UpdateSettingsPayload

    await auth.user.load('setting')
    const userSetting = auth.user.setting

    if (!userSetting) {
      return response.internalServerError({
        errors: [{ message: 'User settings not initialized' }],
      })
    }

    userSetting.merge(payload)
    await userSetting.save()

    return response.ok({ setting: userSetting.serialize() } as SettingsResponse)
  }
}
