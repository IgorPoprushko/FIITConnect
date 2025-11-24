import { UserStatus } from '#enums/user_status'

export type SerializedUser = {
  id: string
  nickname: string
  status: UserStatus
}

export type SerializedMessage = {
  id: string
  content: string
  userId: string
  channelId: string | null
  chatId: string | null
  replyToMsgId: string | null
  isDeleted: boolean
  createdAt: string

  user: SerializedUser
}

export type CreateMessagePayload = {
  content: string
  userId: string
  replyToMsgId?: string | null
  channelId?: string | null
  chatId?: string | null
}

export interface MessageRepositoryContract {
  create(data: CreateMessagePayload): Promise<SerializedMessage>
  getHistory(placeId: string, type: 'channel' | 'chat', limit: number): Promise<SerializedMessage[]>
}
