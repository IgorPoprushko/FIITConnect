import { defineStore } from 'pinia';
import { channelService } from 'src/services/channelService';
import { socketService } from 'src/services/socketService';
import type { ChannelVisual, CreateChannelPayload } from 'src/types/channels';
import type { ChatMessage, IMessage } from 'src/types/messages';
import { mapChatMessageToDisplay } from 'src/types/messages';
import { useAuthStore } from './auth';

interface ChatState {
  channels: ChannelVisual[];
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
      return state.messagesByChannel[state.activeChannelId] ?? [];
    },
  },

  actions: {
    async loadChannels() {
      this.loadingChannels = true;
      try {
        this.channels = await channelService.list();
      } catch (error) {
        console.error('Failed to load channels', error);
      } finally {
        this.loadingChannels = false;
      }
    },

    async createChannel(payload: CreateChannelPayload) {
      const channel = await channelService.create(payload);
      this.channels = [channel, ...this.channels];
      this.setActiveChannel(channel.id);
      return channel;
    },

    setActiveChannel(channelId: string | null) {
      this.activeChannelId = channelId;
      if (channelId && !this.messagesByChannel[channelId]) {
        this.messagesByChannel[channelId] = [];
      }
      if (channelId) {
        socketService.joinChannel(channelId);
      }
    },

    connectSocket() {
      const auth = useAuthStore();
      if (!auth.token || this.connected || this.connecting) return;

      this.connecting = true;

      // ФІКС 1: Викликаємо коннект без створення зайвої змінної socket
      socketService.connect(auth.token);

      socketService.onMessage((message: ChatMessage) => {
        this.appendMessage(mapChatMessageToDisplay(message));
      });

      socketService.onChannelDeleted(({ channelId }) => {
        this.channels = this.channels.filter((c) => c.id !== channelId);
        delete this.messagesByChannel[channelId];
        if (this.activeChannelId === channelId) {
          this.activeChannelId = null;
        }
      });

      socketService.onMemberJoined(({ channelId, userId, nickname }) => {
        console.debug('Member joined', { channelId, userId, nickname });
      });

      socketService.onMemberLeft(({ channelId, userId, nickname }) => {
        console.debug('Member left', { channelId, userId, nickname });
      });

      // ФІКС 2: Прибрали async з аргументу onConnect, щоб не сварився ESLint
      socketService.onConnect(() => {
        this.connected = true;
        this.connecting = false;

        const joinChannelsAction = () => {
          socketService.joinUserChannels(
            auth.user?.id,
            this.channels.map((c) => c.id),
          );
          if (this.activeChannelId) {
            socketService.joinChannel(this.activeChannelId);
          }
        };

        if (!this.channels.length) {
          // ФІКС: додаємо void для ігнорування результату
          // та .catch для обробки можливих помилок
          void this.loadChannels()
            .then(() => {
              joinChannelsAction();
            })
            .catch((error) => {
              console.error('Failed to load channels on connect:', error);
            });
        } else {
          joinChannelsAction();
        }
      });

      socketService.onDisconnect(() => {
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
      bucket.push(message);
    },

    // ФІКС 3: Прибрали async, бо тут немає await (відправка сокетів миттєва)
    sendMessage(content: string) {
      if (!this.activeChannelId) return;

      const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      // Optimistic append
      const optimisticMessage: IMessage = {
        id,
        channelId: this.activeChannelId,
        sender: useAuthStore().nickname || 'You',
        text: content,
        date: new Date(),
        own: true,
        read: true,
      };

      this.appendMessage(optimisticMessage);
      socketService.sendMessage(this.activeChannelId, content);
    },

    hydrateMockMessages() {
      const firstChannel = this.channels[0];
      if (!firstChannel) return;
      const demoChannelId = firstChannel.id;
      this.messagesByChannel[demoChannelId] = [
        {
          id: 'seed-1',
          channelId: demoChannelId,
          sender: 'System',
          text: 'Welcome to FIITConnect!',
          date: new Date(),
          own: false,
          read: true,
        },
      ];
      this.activeChannelId = demoChannelId;
    },
  },
});
