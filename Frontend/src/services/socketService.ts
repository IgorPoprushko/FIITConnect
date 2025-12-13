import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import type { UserStatus, BaseResponse } from 'src/contracts/enums';
import type { UserDto, UserFullDto, ChannelDto, MessageDto, MemberDto } from 'src/contracts/dtos';
import type {
  JoinChannelPayload,
  SendMessagePayload,
  GetMessagesPayload,
  ManageMemberPayload,
} from 'src/contracts/payloads';

// --- ПОДІЇ, ЯКІ ПРИХОДЯТЬ ВІД СЕРВЕРА ---
interface ServerToClientEvents {
  // Messages
  'message:new': (message: MessageDto) => void;

  // Channels
  'channel:member_joined': (payload: {
    channelId: string;
    member: MemberDto;
    isInvite?: boolean;
  }) => void;
  'channel:member_left': (payload: { channelId: string; userId: string; reason?: string }) => void;
  'channel:member_kicked': (payload: { channelId: string; userId: string; reason: string }) => void;
  'channel:deleted': (payload: { channelId: string }) => void;
  'channel:vote_update': (payload: {
    channelId: string;
    targetUserId: string;
    currentVotes: number;
    requiredVotes: number;
  }) => void;

  // User Settings
  'user:settings_updated': (settings: any) => void;

  // Typing
  'user:typing:start': (payload: { userId: string; nickname: string; channelName: string }) => void; // Перевір channelName vs Id на бекенді в activities
  'user:typing:stop': (payload: { userId: string; nickname: string; channelName: string }) => void;
  'user:typing:draft_update': (payload: {
    userId: string;
    nickname: string;
    channelName: string;
    draft: string;
  }) => void;
  'user:status:changed': (payload: { userId: string; status: UserStatus }) => void;

  // Error global
  error: (payload: { message: string }) => void;
}

// --- ПОДІЇ, ЯКІ МИ ВІДПРАВЛЯЄМО ---
// Тут ми використовуємо колбеки (ack), тому типізація трохи складніша
interface ClientToServerEvents {
  // Users
  'user:get:public_info': (
    payload: { nickname: string },
    cb: (res: BaseResponse<UserDto>) => void,
  ) => void;
  'user:get:full_info': (cb: (res: BaseResponse<UserFullDto>) => void) => void;
  'user:get:channels': (cb: (res: BaseResponse<ChannelDto[]>) => void) => void;
  'user:update:settings': (payload: any, cb: (res: BaseResponse<any>) => void) => void;

  // Channels
  'channel:join': (
    payload: JoinChannelPayload,
    cb: (res: BaseResponse<ChannelDto>) => void,
  ) => void;
  'channel:leave': (payload: { channelName: string }, cb: (res: BaseResponse) => void) => void;
  'channel:delete': (payload: { channelName: string }, cb: (res: BaseResponse) => void) => void;
  'channel:invite': (payload: ManageMemberPayload, cb: (res: BaseResponse) => void) => void;
  'channel:revoke': (payload: ManageMemberPayload, cb: (res: BaseResponse) => void) => void;
  'channel:kick': (payload: ManageMemberPayload, cb: (res: BaseResponse) => void) => void;
  'channel:list_members': (
    payload: { channelName: string },
    cb: (res: BaseResponse<MemberDto[]>) => void,
  ) => void;

  // Messages
  'message:send': (
    payload: SendMessagePayload,
    cb: (res: BaseResponse<MessageDto>) => void,
  ) => void;
  'message:list': (
    payload: GetMessagesPayload,
    cb: (res: BaseResponse<MessageDto[]>) => void,
  ) => void;

  // Activities
  'user:change:status': (payload: { newStatus: UserStatus }) => void;
  'typing:start': (payload: { channelName: string }) => void;
  'typing:stop': (payload: { channelName: string }) => void;
  'typing:draft_update': (payload: { channelName: string; draft: string }) => void;
}

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  // URL бекенда
  private readonly url = import.meta.env.VITE_WS_URL || 'http://localhost:3333';

  // --- CONNECTION ---

  connect(token: string) {
    if (this.socket) this.disconnect();

    this.socket = io(this.url, {
      transports: ['websocket'], // Краще форсувати вебсокети
      auth: { token }, // Токен для ws.ts authenticate()
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
  }

  // --- HELPER: Promise wrapper for emits ---
  // Ця магія дозволяє писати: const res = await socketService.sendMessage(...)
  private emitWithAck<T>(
    event: keyof ClientToServerEvents,
    payload?: any,
  ): Promise<BaseResponse<T>> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not connected'));

      // @ts-ignore - TypeScript іноді складно з динамічними івентами Socket.IO
      this.socket.emit(event, payload, (response: BaseResponse<T>) => {
        if (response.status === 'ok') {
          resolve(response);
        } else {
          reject(new Error(response.message || 'Unknown error'));
        }
      });
    });
  }

  // --- MESSAGES API ---

  async sendMessage(channelId: string, content: string) {
    return this.emitWithAck<MessageDto>('message:send', { channelId, content });
  }

  async getMessages(channelId: string, cursor?: number) {
    return this.emitWithAck<MessageDto[]>('message:list', { channelId, cursor });
  }

  // --- CHANNELS API ---

  async joinOrCreateChannel(channelName: string, isPrivate: boolean = false) {
    return this.emitWithAck<ChannelDto>('channel:join', { channelName, isPrivate });
  }

  async leaveChannel(channelName: string) {
    return this.emitWithAck<void>('channel:leave', { channelName });
  }

  async deleteChannel(channelName: string) {
    return this.emitWithAck<void>('channel:delete', { channelName });
  }

  async inviteUser(channelName: string, nickname: string) {
    return this.emitWithAck<void>('channel:invite', { channelName, nickname });
  }

  async kickUser(channelName: string, nickname: string) {
    return this.emitWithAck<void>('channel:kick', { channelName, nickname });
  }

  async revokeUser(channelName: string, nickname: string) {
    return this.emitWithAck<void>('channel:revoke', { channelName, nickname });
  }

  async getChannelMembers(channelName: string) {
    return this.emitWithAck<MemberDto[]>('channel:list_members', { channelName });
  }

  // --- USERS API ---

  async getMyProfile() {
    // Тут payload не потрібен
    return new Promise<BaseResponse<UserFullDto>>((resolve, reject) => {
      this.socket?.emit('user:get:full_info', (res) => resolve(res));
    });
  }

  async getMyChannels() {
    return new Promise<BaseResponse<ChannelDto[]>>((resolve, reject) => {
      this.socket?.emit('user:get:channels', (res) => resolve(res));
    });
  }

  async getPublicUserProfile(nickname: string) {
    return this.emitWithAck<UserDto>('user:get:public_info', { nickname });
  }

  async updateSettings(settings: any) {
    return this.emitWithAck<any>('user:update:settings', settings);
  }

  // --- ACTIVITIES (Typing / Status) ---
  // Ці методи зазвичай не потребують відповіді (fire and forget)

  changeStatus(newStatus: UserStatus) {
    this.socket?.emit('user:change:status', { newStatus });
  }

  startTyping(channelName: string) {
    this.socket?.emit('typing:start', { channelName });
  }

  stopTyping(channelName: string) {
    this.socket?.emit('typing:stop', { channelName });
  }

  updateDraft(channelName: string, draft: string) {
    this.socket?.emit('typing:draft_update', { channelName, draft });
  }

  // --- LISTENERS (Підписка на події) ---

  onNewMessage(handler: (msg: MessageDto) => void) {
    this.socket?.on('message:new', handler);
  }

  onMemberJoined(
    handler: (data: { channelId: string; member: MemberDto; isInvite?: boolean }) => void,
  ) {
    this.socket?.on('channel:member_joined', handler);
  }

  onMemberLeft(handler: (data: { channelId: string; userId: string; reason?: string }) => void) {
    this.socket?.on('channel:member_left', handler);
  }

  onMemberKicked(handler: (data: { channelId: string; userId: string; reason: string }) => void) {
    this.socket?.on('channel:member_kicked', handler);
  }

  onChannelDeleted(handler: (data: { channelId: string }) => void) {
    this.socket?.on('channel:deleted', handler);
  }

  onVoteUpdate(
    handler: (data: {
      channelId: string;
      targetUserId: string;
      currentVotes: number;
      requiredVotes: number;
    }) => void,
  ) {
    this.socket?.on('channel:vote_update', handler);
  }

  // Відписка від подій (щоб не дублювались при перемонтуванні компонентів)
  off(event: keyof ServerToClientEvents) {
    this.socket?.off(event);
  }
}

export const socketService = new SocketService();
