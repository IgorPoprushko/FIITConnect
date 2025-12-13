// frontend/src/stores/chat.ts (ФІНАЛЬНА ВЕРСІЯ З ДОДАТКОВИМИ ЛОГАМИ)

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
    // ❗ ЗМІНА: Геттер активних повідомлень працює як раніше
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
      console.log('🟡 ChatStore: Executing loadChannels action...');
      try {
        // >>> ДОДАНО ЛОГ: Чи ми викликаємо WS-сервіс?
        console.log('🟡 ChatStore: Calling socketService.listChannels()...');
        // 🔥 await тут КРИТИЧНО важливий, і він використовується коректно
        this.channels = await socketService.listChannels();

        console.log(`✅ ChatStore: Successfully loaded ${this.channels.length} channels.`);
      } catch (error) {
        // Цей блок спрацьовує при таймауті
        console.error('❌ Failed to load channels (Socket ACK Error):', error);
      } finally {
        this.loadingChannels = false;
      }
    }, // ПРАВИЛЬНИЙ createChannel (використовує WS)

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

      socketService.connect(auth.token);

      socketService.onNewMessage((payload: NewMessageEvent) => {
        console.log(`[WS IN] New message in ${payload.channelId} from ${payload.user?.nickname}`); // ДОДАТКОВИЙ ЛОГ
        this.appendMessage(mapMessageDtoToDisplay(payload));
      });

      socketService.onChannelDeleted((payload: ChannelActionPayload) => {
        this.channels = this.channels.filter((c) => c.id !== payload.channelId);
        delete this.messagesByChannel[payload.channelId];
        if (this.activeChannelId === payload.channelId) {
          this.activeChannelId = null;
        }
      }); // 4. ПРИЄДНАННЯ/ВІДХОДЖЕННЯ КОРИСТУВАЧА

      socketService.onMemberJoined((payload: MemberJoinedEvent) => {
        console.debug(`[WS IN] Member joined: ${payload.member.nickname} in ${payload.channelId}`); // ДОДАТКОВИЙ ЛОГ
      });

      socketService.onMemberLeft((payload: MemberLeftEvent) => {
        console.debug(`[WS IN] Member left: ${payload.userId} from ${payload.channelId}`); // ДОДАТКОВИЙ ЛОГ
      });

      socketService.onConnect(() => {
        console.log('✅ ChatStore: WS Connected. Proceeding to load channels.');
        this.connected = true;
        this.connecting = false;

        const initializeChannels = () => {
          // ❗ ЗМІНА: Перевіряємо, чи activeChannel існує
          console.log(
            `✅[INIT] Initializing channel. Current state: ${this.activeChannel ? this.activeChannel.name : 'null'}`,
          ); // ДОДАТКОВИЙ ЛОГ
          if (this.activeChannel && !this.activeChannelId) {
            this.setActiveChannel(this.activeChannel.id);
            console.debug(`✅[INIT] Channel initialized: set active to ${this.activeChannel.id}`);
          } else if (!this.activeChannel) {
            console.log('✅[INIT] No channel found after load.'); // ДОДАТКОВИЙ ЛОГ
          }
        }; // ❗ ВИПРАВЛЕННЯ ДУБЛЮВАННЯ + ВИПРАВЛЕННЯ ГОНКИ УМОВ (100 мс) ❗

        setTimeout(() => {
          console.log('✅[INIT] Timeout passed (100ms). Starting channel loading check...'); // ДОДАТКОВИЙ ЛОГ
          // ❗ ЗМІНА: Перевіряємо, чи активний канал вже завантажено
          if (!this.activeChannel) {
            console.log('✅[INIT] Active channel is null. Calling loadChannels.'); // ДОДАТКОВИЙ ЛОГ
            this.loadChannels()
              .then(() => {
                console.debug(`✅[INIT] Channel loaded: ${this.activeChannel?.name}`);
                initializeChannels();
              })
              .catch((error) => {
                console.error('❌ Failed to load channels on connect (Error in Promise):', error);
                initializeChannels();
              });
          } else {
            console.log('✅[INIT] Channel already populated. Initializing directly.'); // ДОДАТКОВИЙ ЛОГ
            initializeChannels();
          }
        }, 100); // 100 мс для уникнення гонки умов
      });

      socketService.onDisconnect(() => {
        console.warn('🛑 ChatStore: WS Disconnected.');
        this.connected = false;
      });
    },

    disconnectSocket() {
      console.warn('🛑 ChatStore: Manually disconnecting WS.'); // ДОДАТКОВИЙ ЛОГ
      socketService.disconnect();
      this.connected = false;
      this.connecting = false;
    },

    appendMessage(message: IMessage) {
      console.log(`[MSG] Appending message ID ${message.id} to channel ${message.channelId}`); // ДОДАТКОВИЙ ЛОГ
      const bucket = (this.messagesByChannel[message.channelId] ||= []);
      bucket.push(message); // ❗ ЗМІНА: Перевірка лише активного каналу

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

      console.log(
        `[MSG] Sending message to ${this.activeChannelId}: "${content.substring(0, 20)}..."`,
      ); // ДОДАТКОВИЙ ЛОГ
      // ... (Optimistic append logic)
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
        console.error('❌ Failed to send message (WS ACK Error):', error); // ЗМІНЕНЕ ЛОГУВАННЯ
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
