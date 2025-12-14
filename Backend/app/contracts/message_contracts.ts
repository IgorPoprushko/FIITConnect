import { UserDto } from '#contracts/user_contracts'

// --- MODELS (DTOs) ---

export interface MessageDto {
  id: string
  content: string
  sentAt: string
  userId: string
  user?: UserDto
  mentions: string[]
}

// --- PAYLOADS (INPUT) ---

export interface SendMessagePayload {
  channelId: string
  content: string
}

export interface GetMessagesPayload {
  channelId: string
  cursor?: number
  limit?: number
}

export interface TypingPayload {
  channelId: string
  isTyping: boolean
  draft?: string
}

// --- EVENTS (OUTPUT) ---

export interface NewMessageEvent extends MessageDto {
  channelId: string
}

export interface TypingEvent {
  userId: string
  nickname: string
  channelId: string
  isTyping: boolean
  draft?: string
}
