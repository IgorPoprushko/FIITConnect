// app/contracts/message_contracts.ts
import { UserDto } from '#contracts/user_contracts'

// --- MODELS (DTOs) ---

export interface MessageDto {
  id: number // ID повідомлення (BigInt краще передавати як string, якщо JS, але тут number ок для < 2^53)
  content: string
  sentAt: string // ISO Date string
  userId: string // ID автора (для швидкого порівняння "чи це я")
  user?: UserDto // Об'єкт автора (може бути пустим, якщо ми вже закешували юзера на фронті)
  mentions?: string[] // Масив ID користувачів, яких тегнули
}

// --- PAYLOADS (INPUT) ---

export interface SendMessagePayload {
  channelId: string
  content: string
}

export interface GetMessagesPayload {
  channelId: string
  cursor?: number // ID останнього завантаженого повідомлення (для Infinite Scroll)
  limit?: number // Скільки грузити (за замовчуванням 50)
}

export interface TypingPayload {
  channelId: string
  isTyping: boolean
  draft?: string // Опціонально: передавати сам текст драфта
}

// --- EVENTS (OUTPUT) ---

// Подія нового повідомлення
export interface NewMessageEvent extends MessageDto {
  channelId: string
}

// Подія "хтось пише"
export interface TypingEvent {
  userId: string
  nickname: string
  channelId: string
  isTyping: boolean
  draft?: string
}
