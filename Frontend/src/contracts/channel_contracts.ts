import type { ChannelType } from 'src/enums/global_enums';
import type { UserDto } from 'src/contracts/user_contracts';
// DateTime/Date не можна використовувати напряму в контрактах. Використовуємо string (ISO 8601).

// --- DTOs (Data Transfer Objects) ---

export interface ChannelDto {
  id: string;
  name: string;
  type: ChannelType;
  description?: string | null;
  ownerUserId: string;
  unreadCount: number;
  lastMessage?: {
    content: string;
    sentAt: string; // ВИПРАВЛЕНО: ISO string (замість Date)
    senderNick: string;
  } | null;
}

// Розширення UserDto для інформації про учасника каналу
export interface MemberDto extends UserDto {
  // Додаткова інфа, коли вступив
  joinedAt: string; // ВИПРАВЛЕНО: ISO string (замість DateTime)
}

// --- PAYLOADS (Дані, що відправляються на бекенд) ---

// Для приєднання/створення каналу
export interface JoinChannelPayload {
  channelName: string;
  isPrivate?: boolean;
}

// Для Leave, Delete, List Members (де достатньо лише ID)
export interface ChannelActionPayload {
  channelId: string;
}

// Для Invite, Kick, Revoke (потрібен ID каналу та цільовий користувач)
export interface ManageMemberPayload {
  channelId: string; // ВИПРАВЛЕНО: Завжди використовуємо ID
  nickname: string;
}

// --- EVENTS (Події, що йдуть через WebSocket) ---

// Приєднання нового учасника
export interface MemberJoinedEvent {
  channelId: string;
  member: MemberDto;
  isInvite?: boolean;
}

// Вихід/Кік учасника
export interface MemberLeftEvent {
  channelId: string;
  userId: string;
  reason?: string;
}

// Оновлення голосування
export interface VoteUpdateEvent {
  channelId: string;
  targetUserId: string;
  currentVotes: number;
  requiredVotes: number;
}
