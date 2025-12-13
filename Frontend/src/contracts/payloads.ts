export interface JoinChannelPayload {
  channelName: string;
  isPrivate?: boolean;
}

export interface SendMessagePayload {
  channelId: string;
  content: string;
}

export interface GetMessagesPayload {
  channelId: string;
  cursor?: number;
  limit?: number;
}

export interface ManageMemberPayload {
  channelName: string;
  nickname: string;
}
