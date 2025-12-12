import Message from '#models/message'
import { UserStatus } from '#enums/user_status'
import User from '#models/user'

// --- Визначаємо типи прямо тут, щоб не залежати від зовнішніх файлів ---

export interface CreateMessagePayload {
  content: string
  userId: string
  channelId: string
  replyToMsgId?: string | null
}

export interface SerializedMessage {
  id: string
  content: string
  userId: string
  channelId: string
  replyToMsgId: string | null
  isDeleted: boolean
  createdAt: string
  user: {
    id: string
    nickname: string
    status: UserStatus
  }
  // ВИПРАВЛЕНО: string[], бо ID у нас UUID
  mentionedUserIds: string[]
}

export default class MessageRepository {
  private async serializeMessage(message: Message): Promise<SerializedMessage> {
    const user = message.user!
    // Якщо налаштування не завантажені (раптом), беремо дефолт
    const setting = user.setting

    // Парсинг згадувань (@nickname)
    const mentionRegex = /@([a-zA-Z0-9_]+)/g
    const mentionedNicknames = [...message.content.matchAll(mentionRegex)].map((match) => match[1])

    let mentionedUserIds: string[] = [] // ВИПРАВЛЕНО: Тип string[]

    if (mentionedNicknames.length > 0) {
      // ВИПРАВЛЕНО: 'nickname' (маленькими), як у моделі User
      const mentionedUsers = await User.query().whereIn('nickname', mentionedNicknames)
      mentionedUserIds = mentionedUsers.map((u) => u.id)
    }

    return {
      id: message.id,
      content: message.content,
      userId: message.userId,
      channelId: message.channelId,
      replyToMsgId: message.replyToMsgId,
      isDeleted: message.isDeleted,
      // toISO() може повернути null, тому страхуємось
      createdAt: message.createdAt?.toISO() || new Date().toISOString(),

      user: {
        id: user.id,
        nickname: user.nickname,
        // Якщо статус не знайдено, вважаємо офлайн
        status: setting ? setting.status : UserStatus.OFFLINE,
      },
      mentionedUserIds,
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

    // ВИПРАВЛЕНО: Чистіший синтаксис preload, щоб уникнути помилок типів (Implicit Any)
    await message.load('user', (query) => {
      query.preload('setting')
    })

    return await this.serializeMessage(message)
  }

  async getHistory(
    channelId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SerializedMessage[]> {
    const messages = await Message.query()
      .where('channelId', channelId)
      // ВИПРАВЛЕНО: Чистіший синтаксис
      .preload('user', (query) => {
        query.preload('setting')
      })
      .orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(limit)

    // Реверс, щоб повідомлення йшли в правильному хронологічному порядку для чату
    const serializedMessages = await Promise.all(
      messages.reverse().map((message) => this.serializeMessage(message))
    )

    return serializedMessages
  }
}
