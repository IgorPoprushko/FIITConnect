import { UserStatus } from '#enums/user_status'
import Setting from '#models/setting'
// import { inject } from '@adonisjs/core' // Прибираємо inject, бо не використовуємо конструктор для Ws
import type { AuthenticatedSocket } from '#services/ws' // Імпортуємо тільки ТИП, це не викликає помилку
import app from '@adonisjs/core/services/app'
import Member from '#models/member'
import { Exception } from '@adonisjs/core/exceptions'

// @inject() // Прибираємо декоратор
export default class ActivitiesController {
  // Конструктор видаляємо або залишаємо пустим, щоб розірвати коло залежностей
  // constructor(private ws: Ws) {}

  /**
   * Отримуємо сервіс Ws динамічно, коли він дійсно потрібен.
   * Це розриває циклічну залежність (Circular Dependency).
   */
  private async getWs() {
    // Імпортуємо файл тільки в момент виклику
    const { default: Ws } = await import('#services/ws')
    // Дістаємо вже готовий екземпляр з контейнера Adonis
    return app.container.make(Ws)
  }

  private async broadcastToSharedChannels(userId: string, event: string, payload: any) {
    const userMemberships = await Member.query().where('userId', userId).preload('channel')

    // Отримуємо Ws тут
    const ws = await this.getWs()
    const io = ws.getIo()

    userMemberships.forEach((member) => {
      if (member.channel) {
        io.to(member.channel.name).emit(event, payload)
      }
    })
  }

  public async onTypingStart(socket: AuthenticatedSocket, channelName: string) {
    const user = socket.user!
    socket.to(channelName).emit('user:typing:start', {
      userId: user.id,
      nickname: user.nickname,
      channelName,
    })
  }

  public async onTypingStop(socket: AuthenticatedSocket, channelName: string) {
    const user = socket.user!
    socket.to(channelName).emit('user:typing:stop', {
      userId: user.id,
      nickname: user.nickname,
      channelName,
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

      // Не перезаписуємо DND статус при перепідключенні
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
