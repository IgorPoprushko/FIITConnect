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

  async onJoinPlace(
    socket: Socket,
    placeId: string,
    placeType: 'chat' | 'channel',
    userId: string
  ) {
    const messageRepository = await this.getMessageRepository()

    try {
      const roomName = `${placeType}:${placeId}`

      await socket.join(roomName)
      const history = await messageRepository.getHistory(placeId, placeType)
      socket.emit('message:history', { placeId, placeType, history })

      console.log(`User ${userId} joined room: ${roomName}`)
    } catch (error) {
      console.error('Failed to join place:', error)
      socket.emit('error', { error: 'Failed to join place' })
    }
  }

  async onNewMessage(socket: Socket, payload: CreateMessagePayload) {
    const wsService = await this.getWsService()
    const messageRepository = await this.getMessageRepository()

    try {
      const newMessage = await messageRepository.create(payload)
      const placeId = payload.channelId || payload.chatId
      const placeType = payload.channelId ? 'channel' : 'chat'
      const roomName = `${placeType}:${placeId}`

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
