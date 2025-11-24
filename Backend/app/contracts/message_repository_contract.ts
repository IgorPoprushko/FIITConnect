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
  channelId: string
  replyToMsgId: string | null
  isDeleted: boolean
  createdAt: string

  user: SerializedUser
}

export type CreateMessagePayload = {
  content: string
  userId: string
  channelId: string
  replyToMsgId?: string | null
}

export interface MessageRepositoryContract {
  create(data: CreateMessagePayload): Promise<SerializedMessage>
  getHistory(channelId: string, limit: number): Promise<SerializedMessage[]>
}
