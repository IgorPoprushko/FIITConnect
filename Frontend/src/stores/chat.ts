// frontend/src/stores/chat.ts (ФІНАЛЬНА ВЕРСІЯ)

import { defineStore } from 'pinia';
import { socketService } from 'src/services/socketService';

// === ІМПОРТИ КОНТРАКТІВ ===
import type {
  ChannelDto,
  JoinChannelPayload,
  ChannelActionPayload,
  MemberJoinedEvent,
  MemberLeftEvent,
} from 'src/contracts/channel_contracts';
import type { NewMessageEvent } from 'src/contracts/message_contracts';
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
// ------------------------------------

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
      return state.messagesByChannel[state.activeChannelId] ?? [];
    },
    activeChannel(state): ChannelDto | undefined {
      return state.channels.find((c) => c.id === state.activeChannelId);
    },
  },

  actions: {
    async loadChannels() {
      this.loadingChannels = true;
      // >>> ДОДАНО ЛОГ: Чи ми сюди потрапляємо?
      console.log('🟡 ChatStore: Executing loadChannels action...');
      try {
        // >>> ДОДАНО ЛОГ: Чи ми викликаємо WS-сервіс?
        console.log('🟡 ChatStore: Calling socketService.listChannels()...');
        this.channels = await socketService.listChannels();

        console.log(`✅ ChatStore: Successfully loaded ${this.channels.length} channels.`);
      } catch (error) {
        console.error('❌ Failed to load channels (Socket ACK Error):', error);
      } finally {
        this.loadingChannels = false;
      }
    },

    // ПРАВИЛЬНИЙ createChannel (використовує WS)
    async createChannel(payload: JoinChannelPayload) {
      const channel = await socketService.joinOrCreateChannel(
        payload.channelName,
        payload.isPrivate,
      );
      this.channels = [channel, ...this.channels];
      this.setActiveChannel(channel.id);
      return channel;
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
      if (channelId && !this.messagesByChannel[channelId]) {
        this.messagesByChannel[channelId] = [];
      }
    },
    connectSocket() {
      const auth = useAuthStore();
      if (!auth.token) {
        console.warn('❌ ChatStore: connectSocket Aborted. Auth token is missing.'); // Якщо auth.token відсутній, компонент, що викликає,
        // повинен ПЕРЕВІРИТИ, чи authStore не перебуває у стані завантаження,
        // і викликати connectSocket пізніше.
        return;
      }

      if (this.connected || this.connecting) {
        console.debug('🟡 ChatStore: connectSocket ignored. Already connecting or connected.');
        return;
      }

      console.log('🟢 ChatStore: Starting WS connection with token...');
      this.connecting = true;

      socketService.connect(auth.token); // 1. ПРИЙОМ НОВИХ ПОВІДОМЛЕНЬ

      socketService.onNewMessage((payload: NewMessageEvent) => {
        this.appendMessage(mapMessageDtoToDisplay(payload));
      }); // 3. ВИДАЛЕННЯ КАНАЛУ

      socketService.onChannelDeleted((payload: ChannelActionPayload) => {
        this.channels = this.channels.filter((c) => c.id !== payload.channelId);
        delete this.messagesByChannel[payload.channelId];
        if (this.activeChannelId === payload.channelId) {
          this.activeChannelId = null;
        }
      }); // 4. ПРИЄДНАННЯ/ВІДХОДЖЕННЯ КОРИСТУВАЧА

      socketService.onMemberJoined((payload: MemberJoinedEvent) => {
        console.debug('Member joined', payload);
      });

      socketService.onMemberLeft((payload: MemberLeftEvent) => {
        console.debug('Member left', payload);
      }); // 5. ПІДКЛЮЧЕННЯ

      socketService.onConnect(() => {
        console.log('✅ ChatStore: WS Connected. Proceeding to load channels.');
        this.connected = true;
        this.connecting = false;

        const initializeChannels = () => {
          const firstChannel = this.channels.at(0);
          if (firstChannel && !this.activeChannelId) {
            this.setActiveChannel(firstChannel.id);
            console.debug(`Channel initialized: set active to ${firstChannel.id}`);
          }
        };

        if (!this.channels.length) {
          this.loadChannels()
            .then(() => {
              console.debug(`Channels loaded: ${this.channels.length} items`);
              initializeChannels();
            })
            .catch((error) => {
              console.error('❌ Failed to load channels on connect:', error);
              initializeChannels();
            });
        } else {
          initializeChannels();
        }
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
      bucket.push(message);

      const channel = this.channels.find((c) => c.id === message.channelId);
      if (channel) {
        channel.lastMessage = {
          content: message.text,
          sentAt: message.date.toISOString(),
          senderNick: message.sender,
        }; // TODO: Збільшення unreadCount, якщо канал не активний
      }
    },

    sendMessage(content: string) {
      if (!this.activeChannelId) return; // Генерація тимчасового ID

      const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`; // Optimistic append

      const auth = useAuthStore();
      const optimisticMessage: IMessage = {
        id,
        channelId: this.activeChannelId,
        sender: auth.nickname || 'You',
        text: content,
        date: new Date(),
        own: true,
        read: true,
      };

      this.appendMessage(optimisticMessage); // Обробляємо Promise
      void socketService.sendMessage(this.activeChannelId, content).catch((error) => {
        console.error('Failed to send message:', error);
        // TODO: Логіка відкату або позначки повідомлення як "не відправлене"
      });
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
