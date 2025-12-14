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
import { Notify } from 'quasar'; // 🔥 Для повідомлень

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

          // 🔥 FIX: Оновлюємо прев'ю каналу (останнє повідомлення) на основі завантаженої історії
          // Це гарантує, що навіть якщо при завантаженні списку даних не було,
          // після входу в чат вони з'являться.
          if (history.length > 0) {
            // history приходить від найстарішого до найновішого (зазвичай)
            // Але перевіримо логіку сортування бекенду. Зазвичай [Oldest ... Newest]
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

        // 🔥 FIX: Страховка від багів бекенду.
        // Якщо останнє повідомлення від МЕНЕ, то unreadCount має бути 0.
        // Це виправляє ситуацію, коли "відправник бачить непрочитане".
        this.channels.forEach((c) => {
          if (c.lastMessage?.senderNick === auth.user?.nickname) {
            c.unreadCount = 0;
          }
        });

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
        if (!this.membersByChannel[channelId]) {
          this.membersByChannel[channelId] = [];
        }

        void this.fetchMessages(channelId);
        void this.fetchMembers(channelId);

        const channel = this.channels.find((c) => c.id === channelId);
        if (channel) {
          // 🔥 Якщо ми зайшли в канал, він стає прочитаним
          channel.unreadCount = 0;
          // 🔥 І перестає бути "Новим"
          if (channel.isNew) channel.isNew = false;
        }
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

        // 🔥 FIX: Ігноруємо власні повідомлення, які приходять через WebSocket,
        // тому що ми їх вже додали оптимістично в методі sendMessage.
        // Це запобігає дублюванню (1 sms shows 2 times).
        if (payload.userId === auth.user?.id) {
          console.log('[WS IN] Ignoring own message (already handled via optimistic UI)');
          return;
        }

        this.appendMessage(mapMessageDtoToDisplay(payload));
      });

      socketService.onUserInvited((channel: ChannelDto) => {
        console.log(`[WS IN] You were invited to channel: ${channel.name}`);
        // Додаємо в початок списку
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
        console.debug(`[WS IN] Member joined: ${payload.member.nickname} to channel ${payload.channelId}`);

        // Add member to the channel's member list
        const members = this.membersByChannel[payload.channelId];
        if (members) {
          const exists = members.some((m) => m.id === payload.member.id);
          if (!exists) {
            members.push(payload.member);
          }
        }
      });

      socketService.onMemberLeft((payload: MemberLeftEvent) => {
        console.debug(`[WS IN] Member left: ${payload.userId} from channel ${payload.channelId}`);

        // Remove member from the channel's member list
        const members = this.membersByChannel[payload.channelId];
        if (members) {
          const index = members.findIndex((m) => m.id === payload.userId);
          if (index !== -1) {
            members.splice(index, 1);
          }
        }
      });

      socketService.onMemberKicked((payload: MemberLeftEvent) => {
        console.debug(`[WS IN] Member kicked: ${payload.userId} from ${payload.channelId}`);

        // Remove member from the channel's member list
        const members = this.membersByChannel[payload.channelId];
        if (members) {
          const index = members.findIndex((m) => m.id === payload.userId);
          if (index !== -1) {
            members.splice(index, 1);
          }
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

        // 🔥 FIX: Не збільшуємо unreadCount, якщо повідомлення наше
        if (this.activeChannelId !== message.channelId && !message.own) {
          channel.unreadCount = (channel.unreadCount || 0) + 1;
        }
      }
    },

    async revokeUser(nickname: string) {
      if (!nickname) {
        console.warn('Nickname is required to revoke a user');
        return;
      }

      if (!this.activeChannelId) {
        console.warn('No active channel selected for revoke');
        return;
      }

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
            // Якщо WS подія прийшла раніше (race condition), реальне повідомлення вже може бути в бакеті
            // Але в більшості випадків ми просто оновлюємо ID
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

    hydrateMockMessages() { },
  },
});
