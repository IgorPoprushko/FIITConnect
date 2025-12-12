import { io, type Socket } from 'socket.io-client';
import type { ChatMessage } from 'src/types/messages';

interface ServerToClientEvents {
  'chat:message': (message: ChatMessage) => void;
}

interface ClientToServerEvents {
  'chat:send': (payload: { channelId: string; content: string }) => void;
  'chat:join': (payload: { channelId: string }) => void;
  'chat:leave': (payload: { channelId: string }) => void;
}

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private readonly url =
    import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'http://localhost:3333';

  connect(token: string) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(this.url, {
      transports: ['websocket'],
      auth: { token },
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  onMessage(handler: (message: ChatMessage) => void) {
    this.socket?.on('chat:message', handler);
  }

  sendMessage(channelId: string, content: string) {
    this.socket?.emit('chat:send', { channelId, content });
  }

  joinChannel(channelId: string) {
    this.socket?.emit('chat:join', { channelId });
  }

  leaveChannel(channelId: string) {
    this.socket?.emit('chat:leave', { channelId });
  }
}

export const socketService = new SocketService();
