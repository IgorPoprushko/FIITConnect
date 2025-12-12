import { inject } from '@adonisjs/core'
import type { AuthenticatedSocket } from '#services/ws'
import MessageRepository from '#repositories/message_repository'
import Channel from '#models/channel'
import { Exception } from '@adonisjs/core/exceptions'
import Member from '#models/member'
// import app from '@adonisjs/core/services/app' // ❌ Більше не потрібно

@inject()
export default class MessagesController {
  constructor(private messageRepository: MessageRepository) {}

  /**
   * FIX 1: Правильне отримання Ws (Singleton)
   * Ми беремо готовий об'єкт, а не просимо створити новий.
   */
  private async getWs() {
    const { default: wsInstance } = await import('#services/ws')
    return wsInstance
  }

  public async onNewMessage(
    socket: AuthenticatedSocket,
    // FIX 2: Приймаємо channelId, а не channelName
    // Це логічніше, бо фронтенд шле саме ID
    payload: { channelId: string; content: string }
  ) {
    const { channelId, content } = payload
    const user = socket.user!

    try {
      // FIX 3: Шукаємо канал по ID (Channel.find), а не по імені
      const channel = await Channel.find(channelId)

      if (!channel) {
        throw new Exception('Channel not found', { status: 404 })
      }

      const membership = await Member.query()
        .where('userId', user.id)
        .andWhere('channelId', channel.id)
        .first()

      if (!membership || membership.isBanned) {
        throw new Exception('You are not an active member of this channel.', { status: 403 })
      }

      const newMessage = await this.messageRepository.create({
        content,
        userId: user.id,
        channelId: channel.id,
      })

      // FIX 4: Відправляємо в кімнату з ID каналу
      // У ws.ts ми робили socket.join(channel.id), тому слати треба теж туди.
      const ws = await this.getWs()
      ws.getIo().to(channel.id).emit('message:new', newMessage)

      console.log(`[MSG] Sent to channel ${channel.name} (${channel.id})`)
    } catch (error) {
      console.error('Failed to create new message:', error)
      socket.emit('error', {
        message: error.message || 'Failed to send message.',
        channelId, // Повертаємо ID, щоб фронт знав, де помилка
      })
    }
  }
}
