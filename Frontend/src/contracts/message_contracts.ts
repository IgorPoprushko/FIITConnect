import type { UserDto } from './user_contracts';

// --- DTOs ---

export interface MessageDto {
  id: string; // JS спокійно тримає числа до 2^53
  channelId: string; // <-- ДОДАНО: Для коректної роботи в store
  content: string;
  sentAt: string; // ISO Date string
  userId: string; // ID автора
  user?: UserDto; // Автор (може не прийти, якщо кешований)
  mentions: string[]; // ID тегнутих юзерів
}

// --- PAYLOADS ---

export interface SendMessagePayload {
  channelId: string;
  content: string;
}

export interface GetMessagesPayload {
  channelId: string;
  cursor?: number | undefined; // ID останнього повідомлення для підгрузки
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
