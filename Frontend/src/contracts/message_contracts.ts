import type { UserDto } from './user_contracts';

// --- DTOs ---

export interface MessageDto {
  id: string;
  channelId: string;
  content: string;
  sentAt: string;
  userId: string;
  user?: UserDto;
  mentions: string[];
}

// --- PAYLOADS ---

export interface SendMessagePayload {
  channelId: string;
  content: string;
}

export interface GetMessagesPayload {
  channelId: string;
  cursor?: number | undefined;
  limit?: number | undefined;
}

export interface TypingPayload {
  channelId: string;
  isTyping: boolean;
  draft?: string;
}

// --- EVENTS ---

export interface NewMessageEvent extends MessageDto {
  channelId: string;
}

export interface TypingEvent {
  userId: string;
  nickname: string;
  channelId: string;
  isTyping: boolean;
  draft?: string;
}
