import { defineStore } from 'pinia';
import { socketService } from 'src/services/socketService';

// === ІМПОРТИ КОНТРАКТІВ ===
import type {
  ChannelDto,
  JoinChannelPayload,
  ChannelActionPayload,
} from 'src/contracts/channel_contracts';
import type { NewMessageEvent, MessageDto } from 'src/contracts/message_contracts';
// ==========================

import { useAuthStore } from './auth';

// --- ЛОКАЛЬНІ ТИПИ ДЛЯ ВІДОБРАЖЕННЯ ---
export interface IMessage {
  id: string;
  channelId: string;
  sender: string;
  text: string;
  date: Date;
  own: boolean;
  read: boolean;
}

function mapMessageDtoToDisplay(payload: NewMessageEvent): IMessage {
  const auth = useAuthStore();
  return {
    id: payload.id.toString(),
    channelId: payload.channelId,
    sender: payload.user?.nickname ?? 'Unknown',
    text: payload.content,
    date: new Date(payload.sentAt),
    own: payload.userId === auth.user?.id,
    read: true,
  };
}

// --- STATE ---
interface ChatState {
  channels: ChannelDto[];
  activeChannelId: string | null;
  messagesByChannel: Record<string, IMessage[]>;
  loadingChannels: boolean;
  connecting: boolean;
  connected: boolean;
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    channels: [],
    activeChannelId: null,
    messagesByChannel: {},
    loadingChannels: false,
    connecting: false,
    connected: false,
  }),

  getters: {
    activeMessages(state): IMessage[] {
      if (!state.activeChannelId) return [];

      const messages = state.messagesByChannel[state.activeChannelId] ?? [];

      return [...messages].sort((a, b) => a.date.getTime() - b.date.getTime());
    },

    activeChannel(state): ChannelDto | undefined {
      return state.channels.find((c) => c.id === state.activeChannelId);
    },
  },

  actions: {
    async fetchMessages(channelId: string) {
      if (!channelId) return;

      if (!this.connected) {
        console.log(`⏳ ChatStore: Socket not ready yet. Skipping fetch for ${channelId}.`);
        return;
      }

      console.log(`📥 ChatStore: Fetching history for ${channelId}...`);
      try {
        const history: MessageDto[] = await socketService.getMessages(channelId);

        const formattedMessages: IMessage[] = history.map((dto) =>
          mapMessageDtoToDisplay({ ...dto, channelId }),
        );

        this.messagesByChannel[channelId] = formattedMessages;

        const channel = this.channels.find((c) => c.id === channelId);
        if (channel && this.activeChannelId === channelId) {
          channel.unreadCount = 0;
        }
      } catch (err) {
        console.error('❌ Failed to fetch history:', err);
      }
    },

    async loadChannels() {
      this.loadingChannels = true;
      try {
        // 1. Завантажуємо список каналів
        this.channels = await socketService.listChannels();

        // 2. 🔥 FIX: "Гідратація" (підвантаження) останніх повідомлень
        // Якщо сервер не віддав lastMessage у списку, ми запитуємо історію для кожного каналу окремо.
        // Це гарантує, що після F5 у нас будуть дані для відображення у списку.
        await Promise.all(
          this.channels.map(async (channel) => {
            // Якщо сервер вже був чемний і надіслав lastMessage — пропускаємо, не робимо зайву роботу
            if (channel.lastMessage) return;

            try {
              // Робимо WS запит за повідомленнями для конкретного каналу
              const messages = await socketService.getMessages(channel.id);

              if (messages && messages.length > 0) {
                // Знаходимо найсвіжіше повідомлення серед тих, що прийшли
                const last = messages.reduce((prev, curr) =>
                  new Date(prev.sentAt) > new Date(curr.sentAt) ? prev : curr,
                );

                // Оновлюємо наш локальний канал цими даними
                channel.lastMessage = {
                  content: last.content,
                  sentAt: last.sentAt,
                  senderNick: last.user?.nickname ?? 'Unknown',
                };
              }
            } catch (err) {
              console.warn(`⚠️ Could not fetch last message for channel ${channel.name}`, err);
            }
          }),
        );

        console.log(`✅ ChatStore: Successfully loaded ${this.channels.length} channels.`);
      } catch (error) {
        console.error('❌ Failed to load channels:', error);
      } finally {
        this.loadingChannels = false;
      }
    },

    async createChannel(payload: JoinChannelPayload) {
      const channel = await socketService.joinOrCreateChannel(
        payload.channelName,
        payload.isPrivate,
      );
      this.channels = [channel, ...this.channels];
      this.setActiveChannel(channel.id);
      return channel;
    },

    async leaveChannel(channelId: string) {
      try {
        await socketService.leaveChannel(channelId);
        this.channels = this.channels.filter((c) => c.id !== channelId);
        if (this.activeChannelId === channelId) {
          this.activeChannelId = null;
        }
      } catch (error) {
        console.error('❌ Failed to leave channel:', error);
        throw error;
      }
    },

    updateChannel(updatedChannel: ChannelDto) {
      const index = this.channels.findIndex((c) => c.id === updatedChannel.id);
      if (index !== -1) {
        this.channels.splice(index, 1, updatedChannel);
      } else {
        this.channels.unshift(updatedChannel);
      }
    },

    setActiveChannel(channelId: string | null) {
      this.activeChannelId = channelId;

      if (channelId) {
        if (!this.messagesByChannel[channelId]) {
          this.messagesByChannel[channelId] = [];
        }
        void this.fetchMessages(channelId);

        const channel = this.channels.find((c) => c.id === channelId);
        if (channel) channel.unreadCount = 0;
      }
    },

    connectSocket() {
      const auth = useAuthStore();
      if (!auth.token) return;

      if (this.connected || this.connecting) return;

      console.log('🟢 ChatStore: Starting WS connection...');
      this.connecting = true;
      socketService.connect(auth.token);

      // --- LISTENERS ---

      socketService.onNewMessage((payload: NewMessageEvent) => {
        console.log(`[WS IN] Msg in ${payload.channelId}`);
        this.appendMessage(mapMessageDtoToDisplay(payload));
      });

      socketService.onChannelDeleted((payload: ChannelActionPayload) => {
        this.channels = this.channels.filter((c) => c.id !== payload.channelId);
        delete this.messagesByChannel[payload.channelId];
        if (this.activeChannelId === payload.channelId) {
          this.activeChannelId = null;
        }
      });

      socketService.onMemberJoined((payload) => {
        console.debug(`[WS IN] Member joined: ${payload.member.nickname}`);
      });

      socketService.onMemberLeft((payload) => {
        console.debug(`[WS IN] Member left: ${payload.userId}`);
      });

      socketService.onConnect(() => {
        console.log('✅ ChatStore: WS Connected.');
        this.connected = true;
        this.connecting = false;

        void this.loadChannels().then(() => {
          if (this.activeChannelId) {
            console.log(
              `🔄 ChatStore: Connection restored. Fetching pending messages for ${this.activeChannelId}`,
            );
            void this.fetchMessages(this.activeChannelId);
          }
        });
      });

      socketService.onDisconnect(() => {
        console.warn('🛑 ChatStore: WS Disconnected.');
        this.connected = false;
      });
    },

    disconnectSocket() {
      socketService.disconnect();
      this.connected = false;
      this.connecting = false;
    },

    appendMessage(message: IMessage) {
      const bucket = (this.messagesByChannel[message.channelId] ||= []);
      const exists = bucket.some((m) => m.id === message.id);
      if (!exists) {
        bucket.push(message);
      }

      const channel = this.channels.find((c) => c.id === message.channelId);
      if (channel) {
        channel.lastMessage = {
          content: message.text,
          sentAt: message.date.toISOString(),
          senderNick: message.sender,
        };

        if (this.activeChannelId !== message.channelId && !message.own) {
          channel.unreadCount = (channel.unreadCount || 0) + 1;
        }
      }
    },

    async sendMessage(content: string) {
      if (!this.activeChannelId) return;

      const tempId = `temp-${Date.now()}`;
      const auth = useAuthStore();
      const optimisticMessage: IMessage = {
        id: tempId,
        channelId: this.activeChannelId,
        sender: auth.nickname || 'You',
        text: content,
        date: new Date(),
        own: true,
        read: true,
      };

      this.appendMessage(optimisticMessage);

      try {
        const realMessage = await socketService.sendMessage(this.activeChannelId, content);

        const bucket = this.messagesByChannel[this.activeChannelId];
        if (bucket) {
          const tempIndex = bucket.findIndex((m) => m.id === tempId);
          const realAlreadyExists = bucket.some((m) => m.id === realMessage.id);

          if (tempIndex !== -1) {
            if (realAlreadyExists) {
              console.log('⚡ ChatStore: Race condition won by WS. Removing temp message.');
              bucket.splice(tempIndex, 1);
            } else {
              console.log('⚡ ChatStore: ACK won. Updating temp ID to real ID.');
              const msgToUpdate = bucket[tempIndex];
              if (msgToUpdate) {
                msgToUpdate.id = realMessage.id;
                msgToUpdate.date = new Date(realMessage.sentAt);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to send message:', error);
      }
    },

    hydrateMockMessages() {
      // Mock data if needed
    },
  },
});
