import { inject } from '@adonisjs/core'
import Ws from '#services/ws'
import type { Socket } from 'socket.io'
import type {
  CreateMessagePayload,
  SerializedMessage,
} from '#contracts/message_repository_contract'
import MessageRepository from '#repositories/message_repository'

@inject()
export default class MessagesController {
  constructor(
    protected messageRepository: MessageRepository,
    protected wsService: Ws
  ) {}

  async onJoinPlace(
    socket: Socket,
    placeId: string,
    placeType: 'chat' | 'channel',
    userId: string
  ) {
    const roomName = `${placeType}:${placeId}`
    console.log(`User ${userId} joining room: ${roomName}`)

    socket.join(roomName)

    try {
      const history: SerializedMessage[] = await this.messageRepository.getHistory(
        placeId,
        placeType,
        50
      )

      socket.emit('message:history', { placeId, placeType, history })
    } catch (error) {
      console.error(`Failed to fetch history for ${roomName}:`, error)
      socket.emit('error', { placeId, placeType, error: 'Failed to fetch history' })
    }
  }

  async onNewMessage(socket: Socket, payload: CreateMessagePayload) {
    const { userId, content, channelId, chatId } = payload

    const placeId = channelId || chatId
    const placeType = channelId ? 'channel' : chatId ? 'chat' : null

    if (!placeId || !placeType || !userId || !content) {
      return socket.emit('error', { error: 'Invalid message payload' })
    }

    const roomName = `${placeType}:${placeId}`
    console.log(`New message in channel ${channelId} from user ${userId}: ${content}`)

    try {
      const message: SerializedMessage = await this.messageRepository.create(payload)
      this.wsService.io?.to(roomName).emit('message:new', message)
    } catch (error) {
      console.error('Failed to create new message:', error)
      socket.emit('error', { error: 'Failed to create new message' })
    }
  }
}
