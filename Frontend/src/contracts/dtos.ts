import type { UserStatus, ChannelType } from 'src/types';

export interface UserDto {
  id: string;
  nickname: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  lastSeenAt: string | null;
}

export interface UserFullDto extends UserDto {
  email: string;
  settings: {
    status: UserStatus;
    notificationsEnabled: boolean;
    directNotificationsOnly: boolean;
  };
}

export interface ChannelDto {
  id: string;
  name: string;
  type: ChannelType;
  description?: string | null;
  ownerUserId: string;
  unreadCount: number;
  lastMessage?: {
    content: string;
    sentAt: string;
    senderNick: string;
  } | null;
}

export interface MemberDto extends UserDto {
  joinedAt?: string;
}

export interface MessageDto {
  id: number;
  content: string;
  sentAt: string;
  userId: string;
  user?: UserDto;
  mentions: string[];
}
