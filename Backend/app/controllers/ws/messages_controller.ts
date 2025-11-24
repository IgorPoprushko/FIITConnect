import { inject } from '@adonisjs/core'
import Ws from '#services/ws'
import type { Socket } from 'socket.io'
import type { CreateMessagePayload } from '#contracts/message_repository_contract'
import MessageRepository from '#repositories/message_repository'
import app from '@adonisjs/core/services/app'

@inject()
export default class MessagesController {
  private async getWsService(): Promise<Ws> {
    return app.container.make(Ws)
  }

  private async getMessageRepository(): Promise<MessageRepository> {
    return app.container.make(MessageRepository)
  }

  async onJoinChannel(socket: Socket, channelId: string, userId: string) {
    const messageRepository = await this.getMessageRepository()

    try {
      const roomName = `channel:${channelId}`

      await socket.join(roomName)
      const history = await messageRepository.getHistory(channelId)
      socket.emit('message:history', { channelId, history })

      console.log(`User ${userId} joined room: ${roomName}`)
    } catch (error) {
      console.error('Failed to join channel:', error)
      socket.emit('error', { error: 'Failed to join channel' })
    }
  }

  async onNewMessage(socket: Socket, payload: CreateMessagePayload) {
    const wsService = await this.getWsService()
    const messageRepository = await this.getMessageRepository()

    try {
      const newMessage = await messageRepository.create(payload)
      const roomName = `channel:${payload.channelId}`

      if (roomName) {
        wsService.io?.to(roomName).emit('message:new', newMessage)
        console.log(`Message sent to room ${roomName} from user ${payload.userId}`)
      }
    } catch (error) {
      console.error('Failed to create new message:', error)
      socket.emit('error', { error: 'Failed to create new message' })
    }
  }
}
