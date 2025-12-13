export enum ChannelType {
  PRIVATE = 1,
  PUBLIC = 0,
}

export interface ChannelFullResponse {
  name: string;
  description?: string | null;
  type: ChannelType;
  ownerUserId: string;
  lastMessageAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  countOfMembers: number;
}

export interface CreateChannelPayload {
  name: string;
  description?: string | null;
  type: ChannelType;
}

export interface ChannelInfo {
  id: string;
  name: string;
  description?: string | null;
  type: ChannelType;
  ownerUserId: string;
  lastMessageAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelVisual {
  id: string;
  name: string;
  type: ChannelType;
  lastMessage?: {
    content: string;
    sendAt: Date;
  };
  newMessagesCount: number;
}

export interface MemberInfo {
  id: string;
  nickname: string;
  status: number;
}
