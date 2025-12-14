import { UserStatus } from '#enums/global_enums'
import Setting from '#models/setting'
import type { AuthenticatedSocket } from '#services/ws'
import Member from '#models/member'
import { Exception } from '@adonisjs/core/exceptions'

export default class ActivitiesController {
  /**
   * Отримуємо сервіс Ws динамічно.
   * Це розриває циклічну залежність.
   */
  private async getWs() {
    // 👇 ГОЛОВНИЙ ФІКС ТУТ 👇
    // Ми імпортуємо default export, який (завдяки минулому кроку) вже є ГОТОВИМ ОБ'ЄКТОМ (new Ws())
    const { default: wsInstance } = await import('#services/ws')

    // ❌ Було: return app.container.make(Ws) -> Це створювало клона!
    // ✅ Стало: повертаємо сам імпортований об'єкт
    return wsInstance
  }

  // 👇 Цей метод викликав помилку, тепер буде працювати
  private async broadcastToSharedChannels(userId: string, event: string, payload: any) {
    const userMemberships = await Member.query().where('userId', userId).preload('channel')

    // Отримуємо живий, запущений екземпляр Ws
    const ws = await this.getWs()
    // Тепер io існує, бо це той самий Ws, що запускався в server.ts
    const io = ws.getIo()

    userMemberships.forEach((member) => {
      if (member.channel) {
        // io.to(...) працює ідеально
        io.to(member.channel.id).emit(event, payload)
        // Примітка: перевір, чи використовуєш ти channel.name чи channel.id для кімнат.
        // У ws.ts ти робив socket.join(member.channel.id), тому тут краще теж .id
      }
    })
  }

  public async onTypingStart(
    socket: AuthenticatedSocket,
    payload: { channelId: string; draft?: string }
  ) {
    const user = socket.user!
    const { channelId, draft } = payload
    socket.to(channelId).emit('user:typing:start', {
      userId: user.id,
      nickname: user.nickname,
      channelId,
      isTyping: true,
      draft: draft ?? '',
    })
  }

  public async onTypingStop(socket: AuthenticatedSocket, payload: { channelId: string }) {
    const user = socket.user!
    const { channelId } = payload
    socket.to(channelId).emit('user:typing:stop', {
      userId: user.id,
      nickname: user.nickname,
      channelId,
      isTyping: false,
    })
  }

  public async onDraftUpdate(
    socket: AuthenticatedSocket,
    payload: { channelName: string; draft: string }
  ) {
    const user = socket.user!
    const { channelName, draft } = payload
    socket.to(channelName).emit('user:typing:draft_update', {
      userId: user.id,
      nickname: user.nickname,
      channelName,
      draft,
    })
  }

  public async onChangeStatus(payload: { userId: string; newStatus: UserStatus }) {
    const { userId, newStatus } = payload

    try {
      const setting = await Setting.findBy('userId', userId)
      if (!setting) {
        throw new Exception(`Setting not found for user ${userId}`)
      }

      setting.status = newStatus
      await setting.save()

      await this.broadcastToSharedChannels(userId, 'user:status:changed', {
        userId: userId,
        status: newStatus,
      })
    } catch (error) {
      console.error(`Error updating status for user ${userId}:`, error)
    }
  }

  public async onConnected(userId: string) {
    console.log(`User ${userId} connected`)

    try {
      const setting = await Setting.findBy('userId', userId)
      if (!setting) {
        return
      }

      if (setting.status !== UserStatus.DND) {
        setting.status = UserStatus.ONLINE
        await setting.save()
      }

      await this.broadcastToSharedChannels(userId, 'user:status:changed', {
        userId: userId,
        status: setting.status,
      })
    } catch (error) {
      console.error(`Error handling connection for user ${userId}:`, error)
    }
  }

  public async onDisconnected(userId: string) {
    console.log(`User ${userId} disconnected`)

    try {
      const setting = await Setting.findBy('userId', userId)
      if (!setting) {
        return
      }

      setting.status = UserStatus.OFFLINE
      await setting.save()

      await this.broadcastToSharedChannels(userId, 'user:status:changed', {
        userId: userId,
        status: UserStatus.OFFLINE,
      })
    } catch (error) {
      console.error(`Error handling disconnection for user ${userId}:`, error)
    }
  }
}
