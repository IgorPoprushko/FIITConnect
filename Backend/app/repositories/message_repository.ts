import {
  CreateMessagePayload,
  MessageRepositoryContract,
  SerializedMessage,
} from '#contracts/message_repository_contract'
import Message from '#models/message'
import { UserStatus } from '#enums/user_status'

export default class MessageRepository implements MessageRepositoryContract {
  private serializeMessage(message: Message): SerializedMessage {
    const user = message.user!
    const setting = user.setting!

    return {
      id: message.id,
      content: message.content,
      userId: message.userId,
      channelId: message.channelId,
      chatId: message.chatId,
      replyToMsgId: message.replyToMsgId,
      isDeleted: message.isDeleted,
      createdAt: message.createdAt!.toISO()!,

      user: {
        id: user.id,
        nickname: user.nickname,
        status: setting.status as UserStatus,
      },
    }
  }

  async create(data: CreateMessagePayload): Promise<SerializedMessage> {
    if (data.channelId && data.chatId) {
      throw new Error('Message cannot belong to both channel and chat')
    }

    const message = await Message.create({
      content: data.content,
      userId: data.userId,
      replyToMsgId: data.replyToMsgId ?? null,
      channelId: data.channelId ?? null,
      chatId: data.chatId ?? null,
      isDeleted: false,
    })

    await message.load((loader) => {
      loader.load('user', (userQuery) => {
        userQuery.preload('setting')
      })
    })

    return this.serializeMessage(message)
  }

  async getHistory(
    placeId: string,
    type: 'channel' | 'chat',
    limit: number = 50
  ): Promise<SerializedMessage[]> {
    const column = type === 'channel' ? 'channelId' : 'chatId'

    const messages = await Message.query()
      .where(column, placeId)
      .preload('user', (userQuery) => {
        userQuery.preload('setting')
      })
      .orderBy('createdAt', 'desc')
      .limit(limit)

    return messages.reverse().map(this.serializeMessage)
  }
}
