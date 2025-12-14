import { ChannelType } from '#enums/global_enums'
import type { UserDto } from '#contracts/user_contracts'

// --- DTOs (Data Transfer Objects) ---

export interface ChannelDto {
  id: string
  name: string
  type: ChannelType
  description?: string | null
  ownerUserId: string
  unreadCount: number
  isNew: boolean
  lastMessage?: {
    content: string
    sentAt: string
    senderNick: string
  } | null
}

export interface MemberDto extends UserDto {
  joinedAt: string
}

export interface JoinChannelPayload {
  channelName: string
  isPrivate?: boolean
}

export interface ChannelActionPayload {
  channelId: string
}

export interface ManageMemberPayload {
  channelId: string
  nickname: string
}

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
