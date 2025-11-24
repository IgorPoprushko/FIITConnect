import { UserStatus } from '#enums/user_status'
import Setting from '#models/setting'
import { inject } from '@adonisjs/core'
import Ws from '#services/ws'
import app from '@adonisjs/core/services/app'

@inject()
export default class ActivitiesController {
  private async getWsService(): Promise<Ws> {
    return app.container.make(Ws)
  }

  private async getSettingByUserId(userId: string) {
    return Setting.query().where('userId', userId).first()
  }

  async onChangeStatus(payload: { userId: string; newStatus: UserStatus }) {
    const { userId, newStatus } = payload
    const wsService = await this.getWsService()

    try {
      const setting = await this.getSettingByUserId(userId)

      if (!setting) {
        console.warn(`Setting not found for user ${userId}. Status update aborted.`)
        return
      }

      setting.status = newStatus
      await setting.save()

      const statusUpdate = {
        userId: userId,
        status: newStatus,
      }
      wsService.io?.emit('user:status:update', statusUpdate)
    } catch (error) {
      console.error(`Error updating status for user ${userId}:`, error)
    }
  }

  async onConnected(userId: string) {
    console.log(`User ${userId} connected`)
    const wsService = await this.getWsService()

    try {
      const setting = await this.getSettingByUserId(userId)

      if (!setting) {
        console.warn(`Setting not found for user ${userId} on connection. Status update skipped.`)
        return
      }

      if (setting.status !== UserStatus.DND) {
        setting.status = UserStatus.ONLINE
        await setting.save()
      }

      const statusUpdate = {
        userId: userId,
        status: setting.status,
      }
      wsService.io?.emit('user:status:update', statusUpdate)
    } catch (error) {
      console.error(`Error handling connection for user ${userId}:`, error)
    }
  }

  async onDisconnected(userId: string) {
    const wsService = await this.getWsService()

    try {
      const setting = await this.getSettingByUserId(userId)

      if (!setting) {
        console.warn(`Setting not found for user ${userId} on disconnection.`)
        return
      }

      setting.status = UserStatus.OFFLINE
      await setting.save()

      const statusUpdate = {
        userId: userId,
        status: UserStatus.OFFLINE,
      }
      wsService.io?.emit('user:status:update', statusUpdate)
    } catch (error) {
      console.error(`Error handling disconnection for user ${userId}:`, error)
    }
  }
}
