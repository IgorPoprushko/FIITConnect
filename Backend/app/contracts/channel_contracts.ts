import type Channel from '#models/channel'
import type Member from '#models/member'
import type Message from '#models/message'
import type User from '#models/user'
import { ChannelType } from '#enums/channel_type'
import { DateTime } from 'luxon'

// *** Payloads ***
export interface CreateChannelPayload {
  name: string
  type: ChannelType
  description?: string | null
}

export interface ManageMemberPayload {
  nickname: string
}

export interface MessageSentPayload {
  content: string
}
export interface GetMessagesPayload {
  limit?: number
  beforeTime?: string
  beforeId?: string
}

// *** Types ***
export type SerializedUser = ReturnType<User['serialize']>
export type SerializedMessage = ReturnType<Message['serialize']>
export type SerializedChannel = ReturnType<Channel['serialize']>
export type SerializedMember = ReturnType<Member['serialize']> & {
  user: SerializedUser
}

// *** Responses ***
export interface ChannelMinResponse {
  channels: {
    id: number
    name: string
    type: ChannelType
    lastMessage: {
      content: string
      sentAt: DateTime
    }
    unreadCount: number
  }[]
}

export interface ChannelFullResponse {
  name: string
  description?: string | null
  type: ChannelType
  ownerUserId: string
  lastMessageAt?: DateTime | null
  createdAt: DateTime
  updatedAt: DateTime
  countOfMembers: number
}

export interface ChannelMembersResponse {
  members: SerializedMember[]
}

export interface ChannelMessagesResponse {
  messages: ReturnType<Message['serialize']>[]
}

export interface ChannelSuccessResponse {
  message: string
}

// *** WebSocket Events ***
export interface ChannelMemberJoinedEvent {
  channelId: string
  member: SerializedMember
}

export interface ChannelUpdatedEvent {
  channel: SerializedChannel
}

export interface ChannelMemberLeftEvent {
  channelId: string
  userId: string
}

export interface MessageSentEvent {
  channelId: string
  message: SerializedMessage
}
