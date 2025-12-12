import { inject } from '@adonisjs/core'
import type { AuthenticatedSocket } from '#services/ws' // Імпортуємо тільки тип
import MessageRepository from '#repositories/message_repository'
import Channel from '#models/channel'
import { Exception } from '@adonisjs/core/exceptions'
import Member from '#models/member'
import app from '@adonisjs/core/services/app'

@inject()
export default class MessagesController {
  constructor(
    // private ws: Ws, // ВИДАЛЯЄМО з конструктора, щоб розірвати коло
    private messageRepository: MessageRepository
  ) {}

  /**
   * Динамічно отримуємо Ws сервіс
   */
  private async getWs() {
    const { default: Ws } = await import('#services/ws')
    return app.container.make(Ws)
  }

  public async onNewMessage(
    socket: AuthenticatedSocket,
    payload: { channelName: string; content: string }
  ) {
    const { channelName, content } = payload
    const user = socket.user!

    try {
      const channel = await Channel.findBy('name', channelName)
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

      // Отримуємо Ws тут
      const ws = await this.getWs()
      ws.getIo().to(channelName).emit('message:new', newMessage)
    } catch (error) {
      console.error('Failed to create new message:', error)
      socket.emit('error', {
        message: error.message || 'Failed to send message.',
        channelName,
      })
    }
  }
}
