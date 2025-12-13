// frontend/src/services/socketService.ts

import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

// === ІМПОРТ НАШИХ КОНТРАКТІВ ===
import type { BaseResponse, UserStatus } from 'src/enums/global_enums';

import type {
  UserDto,
  UserFullDto,
  UserSettingsDto,
  UpdateSettingsPayload,
  UserStatusEvent,
} from 'src/contracts/user_contracts';
import type {
  ChannelDto,
  MemberDto,
  JoinChannelPayload,
  ManageMemberPayload,
  MemberJoinedEvent,
  MemberLeftEvent,
  VoteUpdateEvent,
  ChannelActionPayload,
} from 'src/contracts/channel_contracts';
import type {
  MessageDto,
  SendMessagePayload,
  GetMessagesPayload,
  NewMessageEvent,
  TypingEvent,
} from 'src/contracts/message_contracts';
// =================================

// Допоміжний тип для колбеків, що повертають лише статус
type BaseVoidResponse = BaseResponse<void>;

// --- ПОДІЇ, ЯКІ ПРИХОДЯТЬ ВІД СЕРВЕРА (OUTPUT) ---
interface ServerToClientEvents {
  // Messages
  'message:new': (payload: NewMessageEvent) => void;

  'channel:member_joined': (payload: MemberJoinedEvent) => void;
  'channel:member_left': (payload: MemberLeftEvent) => void;
  'channel:member_kicked': (payload: MemberLeftEvent & { reason: string }) => void;
  'channel:deleted': (payload: ChannelActionPayload) => void;
  'channel:vote_update': (payload: VoteUpdateEvent) => void;

  'user:settings_updated': (settings: UserSettingsDto) => void;
  'user:status:changed': (payload: UserStatusEvent) => void;

  'user:typing:start': (payload: TypingEvent) => void;
  'user:typing:stop': (payload: TypingEvent) => void;
}

// --- ПОДІЇ, ЯКІ МИ ВІДПРАВЛЯЄМО (INPUT) ---
interface ClientToServerEvents {
  // Users
  'user:get:public_info': (
    payload: { nickname: string },
    cb: (res: BaseResponse<UserDto>) => void,
  ) => void;
  'user:get:full_info': (cb: (res: BaseResponse<UserFullDto>) => void) => void;
  'user:get:channels': (cb: (res: BaseResponse<ChannelDto[]>) => void) => void;
  'user:update:settings': (
    payload: UpdateSettingsPayload,
    cb: (res: BaseResponse<UserSettingsDto>) => void,
  ) => void;

  'channel:join': (
    payload: JoinChannelPayload,
    cb: (res: BaseResponse<ChannelDto>) => void,
  ) => void;

  'channel:leave': (payload: ChannelActionPayload, cb: (res: BaseVoidResponse) => void) => void;
  'channel:delete': (payload: ChannelActionPayload, cb: (res: BaseVoidResponse) => void) => void;
  'channel:invite': (payload: ManageMemberPayload, cb: (res: BaseVoidResponse) => void) => void;
  'channel:revoke': (payload: ManageMemberPayload, cb: (res: BaseVoidResponse) => void) => void;
  'channel:kick': (payload: ManageMemberPayload, cb: (res: BaseVoidResponse) => void) => void;
  'channel:list_members': (
    payload: ChannelActionPayload,
    cb: (res: BaseResponse<MemberDto[]>) => void,
  ) => void;

  'message:send': (
    payload: SendMessagePayload,
    cb: (res: BaseResponse<MessageDto>) => void,
  ) => void;
  'message:list': (
    payload: GetMessagesPayload,
    cb: (res: BaseResponse<MessageDto[]>) => void,
  ) => void;

  'user:change:status': (payload: { newStatus: UserStatus }) => void;
  'typing:start': (payload: ChannelActionPayload) => void;
  'typing:stop': (payload: ChannelActionPayload) => void;
}

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private readonly url = import.meta.env.VITE_WS_URL || 'http://localhost:3333'; // --- CONNECTION ---

  connect(token: string) {
    if (this.socket) this.disconnect();

    this.socket = io(this.url, {
      transports: ['websocket'],
      auth: { token: `Bearer ${token}` },
      path: '/ws',
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to WS');
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ Connection Error:', err.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  } // --- HELPER: Promise wrapper for emits ---

  private emitWithAck<T>(
    event: keyof ClientToServerEvents,
    payload?: unknown,
    timeout: number = 5000,
  ): Promise<BaseResponse<T>> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not connected'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.socket.timeout(timeout).emit as any)(
        event,
        payload,
        (err: Error | null, response: BaseResponse<T>) => {
          if (err) {
            console.error(`[WS ACK TIMEOUT] Event ${event} timed out after ${timeout}ms.`, err);
            return reject(new Error(`Socket ACK timeout for event ${event}`));
          }
          if (response.status === 'ok') {
            resolve(response);
          } else {
            reject(new Error(response.message || `Unknown error on event ${event}`));
          }
        },
      );
    });
  }
  private async emitVoidAck(event: keyof ClientToServerEvents, payload?: unknown): Promise<void> {
    const res = await this.emitWithAck<void>(event, payload);
    return res.data;
  } // --- MESSAGES API ---

  async sendMessage(channelId: string, content: string): Promise<MessageDto> {
    const payload: SendMessagePayload = { channelId, content };
    const res = await this.emitWithAck<MessageDto>('message:send', payload);
    return res.data!;
  }

  async getMessages(channelId: string, cursor?: number, limit?: number): Promise<MessageDto[]> {
    const payload: GetMessagesPayload = { channelId };

    if (cursor !== undefined) {
      payload.cursor = cursor;
    }
    if (limit !== undefined) {
      payload.limit = limit;
    }

    const res = await this.emitWithAck<MessageDto[]>('message:list', payload);
    return res.data!;
  } // --- CHANNELS API ---

  async joinOrCreateChannel(channelName: string, isPrivate: boolean = false): Promise<ChannelDto> {
    const payload: JoinChannelPayload = { channelName, isPrivate };
    const res = await this.emitWithAck<ChannelDto>('channel:join', payload);
    return res.data!;
  }

  async leaveChannel(channelId: string): Promise<void> {
    const payload: ChannelActionPayload = { channelId };
    return this.emitVoidAck('channel:leave', payload);
  }

  async deleteChannel(channelId: string): Promise<void> {
    const payload: ChannelActionPayload = { channelId };
    return this.emitVoidAck('channel:delete', payload);
  }

  async inviteUser(channelId: string, nickname: string): Promise<void> {
    const payload: ManageMemberPayload = { channelId, nickname };
    return this.emitVoidAck('channel:invite', payload);
  }

  async kickUser(channelId: string, nickname: string): Promise<void> {
    const payload: ManageMemberPayload = { channelId, nickname };
    return this.emitVoidAck('channel:kick', payload);
  }

  async revokeUser(channelId: string, nickname: string): Promise<void> {
    const payload: ManageMemberPayload = { channelId, nickname };
    return this.emitVoidAck('channel:revoke', payload);
  }

  async getChannelMembers(channelId: string): Promise<MemberDto[]> {
    const res = await this.emitWithAck<MemberDto[]>('channel:list_members', { channelId });
    return res.data!;
  } // --- USERS API ---

  async getMyProfile(): Promise<UserFullDto> {
    const res = await this.emitWithAck<UserFullDto>('user:get:full_info');
    return res.data!;
  }

  async getMyChannels(): Promise<ChannelDto[]> {
    const res = await this.emitWithAck<ChannelDto[]>('user:get:channels');
    return res.data!;
  }

  async getPublicUserProfile(nickname: string): Promise<UserDto> {
    const res = await this.emitWithAck<UserDto>('user:get:public_info', { nickname });
    return res.data!;
  }

  async updateSettings(settings: UpdateSettingsPayload): Promise<UserSettingsDto> {
    const res = await this.emitWithAck<UserSettingsDto>('user:update:settings', settings);
    return res.data!;
  } // --- ACTIVITIES (Typing / Status) ---

  changeStatus(newStatus: UserStatus) {
    this.socket?.emit('user:change:status', { newStatus });
  }

  startTyping(channelId: string) {
    this.socket?.emit('typing:start', { channelId });
  }

  stopTyping(channelId: string) {
    this.socket?.emit('typing:stop', { channelId });
  } // --- LISTENERS (Підписка на події) ---

  public onConnect(handler: () => void) {
    this.socket?.on('connect', handler);
  }

  public onDisconnect(handler: () => void) {
    this.socket?.on('disconnect', handler);
  }

  onNewMessage(handler: (msg: NewMessageEvent) => void) {
    this.socket?.on('message:new', handler);
  }

  onMemberJoined(handler: (data: MemberJoinedEvent) => void) {
    this.socket?.on('channel:member_joined', handler);
  }

  onMemberLeft(handler: (data: MemberLeftEvent) => void) {
    this.socket?.on('channel:member_left', handler);
  }

  onMemberKicked(handler: (data: MemberLeftEvent & { reason: string }) => void) {
    this.socket?.on('channel:member_kicked', handler);
  }

  onChannelDeleted(handler: (data: ChannelActionPayload) => void) {
    this.socket?.on('channel:deleted', handler);
  }

  onVoteUpdate(handler: (data: VoteUpdateEvent) => void) {
    this.socket?.on('channel:vote_update', handler);
  }

  onUserStatusChanged(handler: (data: UserStatusEvent) => void) {
    this.socket?.on('user:status:changed', handler);
  }

  onTyping(handler: (data: TypingEvent) => void) {
    this.socket?.on('user:typing:start', handler);
  }

  off(event: keyof ServerToClientEvents) {
    this.socket?.off(event);
  }

  async listChannels(): Promise<ChannelDto[]> {
    const res = await this.emitWithAck<ChannelDto[]>('user:get:channels');
    return res.data!;
  }
}

export const socketService = new SocketService();
