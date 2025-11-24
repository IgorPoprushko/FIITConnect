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
    const message = await Message.create({
      content: data.content,
      userId: data.userId,
      channelId: data.channelId,
      replyToMsgId: data.replyToMsgId ?? null,
      isDeleted: false,
    })

    await message.load((loader) => {
      loader.load('user', (userQuery) => {
        userQuery.preload('setting')
      })
    })

    return this.serializeMessage(message)
  }

  async getHistory(channelId: string, limit: number = 50): Promise<SerializedMessage[]> {
    const messages = await Message.query()
      .where('channelId', channelId)
      .preload('user', (userQuery) => {
        userQuery.preload('setting')
      })
      .orderBy('createdAt', 'desc')
      .limit(limit)

    return messages.reverse().map(this.serializeMessage)
  }
}
