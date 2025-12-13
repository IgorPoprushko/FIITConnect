import { ChannelType } from '#enums/channel_type'
import { UserDto } from '#contracts/user_contracts'
import { DateTime } from 'luxon'

// --- DTOs ---

export interface ChannelDto {
  id: string
  name: string
  type: ChannelType
  description?: string | null
  ownerUserId: string
  unreadCount: number
  lastMessage?: {
    content: string
    sentAt: Date
    senderNick: string
  } | null
}

export interface MemberDto extends UserDto {
  // Додаткова інфа, якщо треба (наприклад, коли вступив)
  joinedAt?: DateTime
}

// --- PAYLOADS ---

export interface JoinChannelPayload {
  channelName: string
  isPrivate?: boolean
}

export interface ChannelActionPayload {
  channelId: string // Для Leave, Delete, Info
}

export interface ManageMemberPayload {
  channelName: string
  nickname: string
}

// --- EVENTS ---

export interface MemberJoinedEvent {
  channelId: string
  member: MemberDto
  isInvite?: boolean
}

export interface MemberLeftEvent {
  channelId: string
  userId: string
  reason?: string
}

export interface VoteUpdateEvent {
  channelId: string
  targetUserId: string
  currentVotes: number
  requiredVotes: number
}
