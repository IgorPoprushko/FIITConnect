import { defineStore } from 'pinia';
import { socketService } from 'src/services/socketService';

// === ІМПОРТИ КОНТРАКТІВ ===
import type {
  ChannelDto,
  JoinChannelPayload,
  ChannelActionPayload,
  MemberDto,
  MemberJoinedEvent,
  MemberLeftEvent,
} from 'src/contracts/channel_contracts';
import type { NewMessageEvent, MessageDto } from 'src/contracts/message_contracts';
// ==========================

import { useAuthStore } from './auth';
import { Notify } from 'quasar';
// 🔥 ОБОВ'ЯЗКОВО ІМПОРТУЄМО СТАТУС
import { UserStatus } from 'src/enums/global_enums';

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
  membersByChannel: Record<string, MemberDto[]>;
  loadingChannels: boolean;
  connecting: boolean;
  connected: boolean;
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    channels: [],
    activeChannelId: null,
    messagesByChannel: {},
    membersByChannel: {},
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

    activeMembers(state): MemberDto[] {
      if (!state.activeChannelId) return [];
      return state.membersByChannel[state.activeChannelId] ?? [];
    },
  },

  actions: {
    async fetchMessages(channelId: string) {
      if (!channelId) return;

      const auth = useAuthStore();

      // 🔥 FIX: Якщо юзер OFFLINE, забороняємо завантаження історії.
      // Таким чином, він не побачить нових повідомлень, поки не вийде в онлайн.
      if (auth.settings?.status === UserStatus.OFFLINE) {
        console.log(`🚫 ChatStore: User is OFFLINE. Skipping fetchMessages for ${channelId}.`);
        return;
      }

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
        if (channel) {
          if (this.activeChannelId === channelId) {
            channel.unreadCount = 0;
          }

          // Оновлюємо прев'ю каналу
          if (history.length > 0) {
            const latest = history[history.length - 1];
            if (latest) {
              channel.lastMessage = {
                content: latest.content,
                sentAt: latest.sentAt,
                senderNick: latest.user?.nickname ?? 'Unknown',
              };
            }
          }
        }
      } catch (err) {
        console.error('❌ Failed to fetch history:', err);
      }
    },

    async fetchMembers(channelId: string) {
      if (!channelId) return;

      const auth = useAuthStore();
      // 🔥 FIX: Також блокуємо завантаження учасників в офлайні
      if (auth.settings?.status === UserStatus.OFFLINE) {
        console.log(`🚫 ChatStore: User is OFFLINE. Skipping fetchMembers for ${channelId}.`);
        return;
      }

      if (!this.connected) {
        console.log(`⏳ ChatStore: Socket not ready yet. Skipping member fetch for ${channelId}.`);
        return;
      }

      console.log(`👥 ChatStore: Fetching members for ${channelId}...`);
      try {
        const members: MemberDto[] = await socketService.getChannelMembers(channelId);
        this.membersByChannel[channelId] = members;
        console.log(`✅ ChatStore: Loaded ${members.length} members for channel ${channelId}`);
      } catch (err) {
        console.error('❌ Failed to fetch members:', err);
      }
    },

    async loadChannels() {
      this.loadingChannels = true;
      const auth = useAuthStore();

      try {
        // 1. Завантажуємо список каналів
        this.channels = await socketService.listChannels();

        this.channels.forEach((c) => {
          if (c.lastMessage?.senderNick === auth.user?.nickname) {
            c.unreadCount = 0;
          }
        });

        console.log(`✅ ChatStore: Successfully loaded ${this.channels.length} channels.`);

        // 🔥 АВТО-ОНОВЛЕННЯ ПРИ ЗМІНІ СТАТУСУ НА ONLINE
        // Якщо ми вже в каналі і перейшли в онлайн, довантажуємо повідомлення
        if (this.activeChannelId) {
          // Тут fetchMessages спрацює, бо статус вже не Offline
          // (ми це перевірили перед викликом loadChannels в ChatLayout)
          await this.fetchMessages(this.activeChannelId);
          await this.fetchMembers(this.activeChannelId);
        }
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
        if (!this.membersByChannel[channelId]) {
          this.membersByChannel[channelId] = [];
        }

        // Тут викликаються методи, які тепер мають захист від OFFLINE
        void this.fetchMessages(channelId);
        void this.fetchMembers(channelId);

        const channel = this.channels.find((c) => c.id === channelId);
        if (channel) {
          channel.unreadCount = 0;
          if (channel.isNew) channel.isNew = false;
        }
      }
    },

    // 🔥 НОВИЙ МЕТОД: Явно просимо дозволу (виклич це десь при старті або по кліку)
    async requestNotificationPermission() {
      if (!('Notification' in window)) return false;
      if (Notification.permission === 'granted') return true;

      console.log('🔔 ChatStore: Requesting notification permission...');
      const result = await Notification.requestPermission();
      return result === 'granted';
    },

    // 🔥 НОВИЙ МЕТОД ДЛЯ СИСТЕМНИХ СПОВІЩЕНЬ
    async sendSystemNotification(payload: NewMessageEvent) {
      const auth = useAuthStore();

      // LOGS для відлагодження
      const debugInfo = {
        status: auth.settings?.status,
        expectedStatus: UserStatus.ONLINE,
        hasFocus: document.hasFocus(),
        permission: 'Notification' in window ? Notification.permission : 'not_supported',
      };

      // 1. Якщо статус НЕ ONLINE - виходимо (DND/Offline ігноруються)
      if (auth.settings?.status !== UserStatus.ONLINE) {
        console.log('🔕 Notification skipped: User not ONLINE', debugInfo);
        return;
      }

      // 2. Якщо вікно має фокус, сповіщення НЕ показуємо.
      if (document.hasFocus()) {
        console.log('🔕 Notification skipped: Window has focus', debugInfo);
        return;
      }

      // 3. Перевіряємо підтримку та дозволи
      if (!('Notification' in window)) {
        console.warn('⚠️ Notifications not supported in this browser');
        return;
      }

      if (Notification.permission === 'granted') {
        this.spawnNotification(payload);
      } else if (Notification.permission === 'default') {
        // ⚠️ Увага: Браузери можуть заблокувати цей запит, якщо він не викликаний кліком.
        // Краще викликати requestNotificationPermission() заздалегідь.
        console.log('🔔 Trying to request permission inside event...');
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          this.spawnNotification(payload);
        } else {
          console.warn('🔕 Permission denied or dismissed');
        }
      } else {
        console.log('🔕 Notification permission is DENIED. Please enable in browser settings.');
      }
    },

    spawnNotification(payload: NewMessageEvent) {
      try {
        const title = payload.user?.nickname ?? 'New Message';
        const notification = new Notification(title, {
          body: payload.content,
          // icon: '/icons/logo.png', // Додай сюди шлях до логотипу, якщо є
          tag: `channel-${payload.channelId}`, // Групування сповіщень
          silent: false,
        });

        notification.onclick = () => {
          window.focus();
          if (payload.channelId) {
            this.setActiveChannel(payload.channelId);
          }
          notification.close();
        };
        console.log('✅ Notification sent successfully!');
      } catch (e) {
        console.error('❌ Error showing notification:', e);
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

        if (payload.userId === auth.user?.id) {
          console.log('[WS IN] Ignoring own message');
          return;
        }

        this.appendMessage(mapMessageDtoToDisplay(payload));

        // 🔥 СПРОБУВАТИ ВІДПРАВИТИ СИСТЕМНЕ СПОВІЩЕННЯ
        void this.sendSystemNotification(payload);
      });

      socketService.onUserInvited((channel: ChannelDto) => {
        console.log(`[WS IN] You were invited to channel: ${channel.name}`);
        this.channels = [channel, ...this.channels];
        Notify.create({
          message: `You were invited to ${channel.name}`,
          color: 'positive',
          icon: 'mail',
          position: 'top-right',
          timeout: 5000,
        });
      });

      socketService.onChannelDeleted((payload: ChannelActionPayload) => {
        this.channels = this.channels.filter((c) => c.id !== payload.channelId);
        delete this.messagesByChannel[payload.channelId];
        if (this.activeChannelId === payload.channelId) {
          this.activeChannelId = null;
        }
      });

      socketService.onMemberJoined((payload: MemberJoinedEvent) => {
        console.debug(`[WS IN] Member joined: ${payload.member.nickname}`);
        const members = this.membersByChannel[payload.channelId];
        if (members) {
          const exists = members.some((m) => m.id === payload.member.id);
          if (!exists) members.push(payload.member);
        }
      });

      socketService.onMemberLeft((payload: MemberLeftEvent) => {
        console.debug(`[WS IN] Member left: ${payload.userId}`);
        const members = this.membersByChannel[payload.channelId];
        if (members) {
          const index = members.findIndex((m) => m.id === payload.userId);
          if (index !== -1) members.splice(index, 1);
        }
      });

      socketService.onMemberKicked((payload: MemberLeftEvent) => {
        console.debug(`[WS IN] Member kicked: ${payload.userId}`);
        const members = this.membersByChannel[payload.channelId];
        if (members) {
          const index = members.findIndex((m) => m.id === payload.userId);
          if (index !== -1) members.splice(index, 1);
        }

        if (payload.userId === auth.user?.id) {
          this.channels = this.channels.filter((c) => c.id !== payload.channelId);
          delete this.messagesByChannel[payload.channelId];
          delete this.membersByChannel[payload.channelId];
          if (this.activeChannelId === payload.channelId) {
            this.activeChannelId = null;
          }
          void this.loadChannels();
        }
      });

      socketService.onConnect(() => {
        console.log('✅ ChatStore: WS Connected.');
        this.connected = true;
        this.connecting = false;

        // 🔥 Спробуємо запросити дозволи при підключенні (може не спрацювати в деяких браузерах без кліку)
        // Але оскільки connectSocket часто викликається при mount, це може бути ОК.
        // Краще це робити по кнопці "Enable Notifications" десь в UI.

        void this.loadChannels().then(() => {
          if (this.activeChannelId) {
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

    async revokeUser(nickname: string) {
      if (!nickname || !this.activeChannelId) return;
      try {
        await socketService.revokeUser(this.activeChannelId, nickname);
      } catch (error) {
        console.error('Failed to revoke user:', error);
        throw error;
      }
    },

    async inviteUser(nickname: string) {
      if (!nickname || !this.activeChannelId) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response: any = await socketService.inviteUser(this.activeChannelId, nickname);
        if (response && response.status === 'error') {
          throw new Error(response.message || 'Failed to invite user');
        }
      } catch (error) {
        console.error('Failed to invite user:', error);
        throw error;
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
          if (tempIndex !== -1) {
            const msgToUpdate = bucket[tempIndex];
            if (msgToUpdate) {
              msgToUpdate.id = realMessage.id;
              msgToUpdate.date = new Date(realMessage.sentAt);
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to send message:', error);
      }
    },

    hydrateMockMessages() {},
  },
});
