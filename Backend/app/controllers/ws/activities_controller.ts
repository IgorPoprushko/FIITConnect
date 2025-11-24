import { UserStatus } from '#enums/user_status'
import Setting from '#models/setting'
import { inject } from '@adonisjs/core'
import Ws from '#services/ws'

@inject()
export default class ActivitiesController {
  constructor(protected wsService: Ws) {}

  async onChangeStatus(payload: { userId: string; newStatus: UserStatus }) {
    const { userId, newStatus } = payload

    const setting = await Setting.findOrFail(userId)
    setting.status = newStatus
    await setting.save()

    const statusUpdate = {
      userId: userId,
      status: newStatus,
    }
    this.wsService.io?.emit('user:status:update', statusUpdate)
  }

  async onConnected(userId: string) {
    console.log(`User ${userId} connected with socket ID: ${this.wsService.io}`)

    const setting = await Setting.findOrFail(userId)

    if (setting.status !== UserStatus.DND) {
      setting.status = UserStatus.ONLINE
      await setting.save()
    }

    const statusUpdate = {
      userId: userId,
      status: setting.status,
    }
    this.wsService.io?.emit('user:status:update', statusUpdate)
  }

  async onDisconnected(userId: string) {
    const setting = await Setting.findOrFail(userId)
    setting.status = UserStatus.OFFLINE
    await setting.save()

    const statusUpdate = {
      userId: userId,
      status: UserStatus.OFFLINE,
    }
    this.wsService.io?.emit('user:status:update', statusUpdate)
  }
}
