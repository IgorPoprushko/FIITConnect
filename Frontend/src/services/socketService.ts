import { io, type Socket } from 'socket.io-client';
import type { ChatMessage } from 'src/types/messages';
import type { ChannelVisual } from 'src/types/channels'; // Потрібно імпортувати ChannelVisual

interface ServerToClientEvents {
  'channel:messageSent': (message: ChatMessage) => void;
  'chat:message': (message: ChatMessage) => void; // backward compatibility
  'channel:deleted': (payload: { channelId: string }) => void;
  'channel:memberJoined': (payload: {
    channelId: string;
    userId: string;
    nickname?: string;
  }) => void;
  'channel:memberLeft': (payload: { channelId: string; userId: string; nickname?: string }) => void;
  // ФІКС 1: Додаємо очікувану подію від бекенду
  'channel:updated': (payload: { channel: ChannelVisual }) => void;
}

interface ClientToServerEvents {
  'chat:send': (payload: { channelId: string; content: string }) => void;
  'chat:join': (payload: { channelId: string }) => void;
  'chat:leave': (payload: { channelId: string }) => void;
  'user:joinChannels': (userId: string | undefined, channelIds: string[]) => void;
}

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private readonly url =
    import.meta.env.VITE_WS_URL ||
    import.meta.env.VITE_API_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3333');

  connect(token: string) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(this.url, {
      transports: ['websocket', 'polling'],
      auth: { token },
      path: '/ws',
      withCredentials: true,
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  onConnect(handler: () => void) {
    this.socket?.on('connect', handler);
  }

  onDisconnect(handler: () => void) {
    this.socket?.on('disconnect', handler);
  }

  onMessage(handler: (message: ChatMessage) => void) {
    this.socket?.on('channel:messageSent', handler);
    this.socket?.on('chat:message', handler);
  }

  onChannelDeleted(handler: (payload: { channelId: string }) => void) {
    this.socket?.on('channel:deleted', handler);
  }

  // ФІКС 2: Додаємо новий метод обробки оновлення каналу
  onChannelUpdated(handler: (payload: { channel: ChannelVisual }) => void) {
    this.socket?.on('channel:updated', handler);
  }

  onMemberJoined(
    handler: (payload: { channelId: string; userId: string; nickname?: string }) => void,
  ) {
    this.socket?.on('channel:memberJoined', handler);
  }

  onMemberLeft(
    handler: (payload: { channelId: string; userId: string; nickname?: string }) => void,
  ) {
    this.socket?.on('channel:memberLeft', handler);
  }

  sendMessage(channelId: string, content: string) {
    this.socket?.emit('chat:send', { channelId, content });
  }

  joinChannel(channelId: string) {
    this.socket?.emit('chat:join', { channelId });
  }

  joinUserChannels(userId: string | undefined, channelIds: string[]) {
    this.socket?.emit('user:joinChannels', userId, channelIds);
  }

  leaveChannel(channelId: string) {
    this.socket?.emit('chat:leave', { channelId });
  }
}

export const socketService = new SocketService();
