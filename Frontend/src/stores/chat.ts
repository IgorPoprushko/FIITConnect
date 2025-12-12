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
    // Додатковий геттер для активного каналу (корисний для відображення деталей)
    activeChannel(state): ChannelVisual | undefined {
      return state.channels.find((c) => c.id === state.activeChannelId);
    },
  },

  actions: {
    async loadChannels() {
      this.loadingChannels = true;
      try {
        // Тут ми припускаємо, що channelService.list повертає ChannelVisual[]
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

    // Допоміжна функція для оновлення каналу в списку
    updateChannel(updatedChannel: ChannelVisual) {
      const index = this.channels.findIndex((c) => c.id === updatedChannel.id);
      if (index !== -1) {
        // Оновлюємо, зберігаючи порядок
        this.channels.splice(index, 1, updatedChannel);
      } else {
        // Додаємо, якщо канал новий (наприклад, після запрошення)
        this.channels.unshift(updatedChannel);
      }
    },

    setActiveChannel(channelId: string | null) {
      this.activeChannelId = channelId;
      if (channelId && !this.messagesByChannel[channelId]) {
        this.messagesByChannel[channelId] = [];
      }
      if (channelId) {
        // Клієнт приєднується до кімнати на бекенді
        socketService.joinChannel(channelId);
      }
    },

    connectSocket() {
      const auth = useAuthStore();
      if (!auth.token || this.connected || this.connecting) return;

      this.connecting = true;

      socketService.connect(auth.token);

      // 1. ПРИЙОМ НОВИХ ПОВІДОМЛЕНЬ
      socketService.onMessage((message: ChatMessage) => {
        this.appendMessage(mapChatMessageToDisplay(message));

        // TODO: Логіка нотифікацій тут (перевірка visible/DND)
      });

      // 2. ОНОВЛЕННЯ КАНАЛУ (наприклад, після запрошення, зміни опису, або оновлення lastMessage)
      // ФІКС 1 & 2: Виправляємо 'any' та 'onChannelUpdated'
      // Тепер TypeScript знає, що channel має тип ChannelVisual
      socketService.onChannelUpdated(({ channel }) => {
        this.updateChannel(channel);
      });

      // 3. ВИДАЛЕННЯ КАНАЛУ (через /quit або неактивність)
      socketService.onChannelDeleted(({ channelId }) => {
        this.channels = this.channels.filter((c) => c.id !== channelId);
        delete this.messagesByChannel[channelId];
        if (this.activeChannelId === channelId) {
          this.activeChannelId = null;
        }
      });

      // 4. ПРИЄДНАННЯ/ВІДХОДЖЕННЯ КОРИСТУВАЧА
      socketService.onMemberJoined(({ channelId, userId, nickname }) => {
        console.debug('Member joined', { channelId, userId, nickname });
        // TODO: Додати логіку для оновлення списку членів каналу
      });

      socketService.onMemberLeft(({ channelId, userId, nickname }) => {
        console.debug('Member left', { channelId, userId, nickname });
        // TODO: Додати логіку для оновлення списку членів каналу
      });

      // 5. ПІДКЛЮЧЕННЯ
      socketService.onConnect(() => {
        this.connected = true;
        this.connecting = false;

        const joinChannelsAction = () => {
          // ФІКС: socketService.joinUserChannels використовує channelIds, що є коректним
          socketService.joinUserChannels(
            auth.user?.id,
            this.channels.map((c) => c.id),
          );
          if (this.activeChannelId) {
            socketService.joinChannel(this.activeChannelId);
          }
        };

        if (!this.channels.length) {
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

      // TODO: Додати обробники для typing:start/stop/draft_update
    },

    disconnectSocket() {
      socketService.disconnect();
      this.connected = false;
      this.connecting = false;
    },

    appendMessage(message: IMessage) {
      const bucket = (this.messagesByChannel[message.channelId] ||= []);
      bucket.push(message);

      // Оновлюємо інформацію про останнє повідомлення у списку каналів (UX)
      const channel = this.channels.find((c) => c.id === message.channelId);
      if (channel) {
        // Припускаємо, що message.date вже є об'єктом Date
        channel.lastMessage = { content: message.text, sendAt: message.date };
        // TODO: Збільшення unreadCount, якщо канал не активний
      }
    },

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
      // Відправляємо повідомлення на бекенд
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
