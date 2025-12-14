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
import type { NewMessageEvent, MessageDto, TypingEvent } from 'src/contracts/message_contracts';
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
  mentionsMe: boolean;
  mentions: string[];
}

function mapMessageDtoToDisplay(payload: NewMessageEvent): IMessage {
  const auth = useAuthStore();
  const mentions = payload.mentions ?? [];
  const mentionsMe = mentions.includes(auth.user?.id ?? '');

  return {
    id: payload.id.toString(),
    channelId: payload.channelId,
    sender: payload.user?.nickname ?? 'Unknown',
    text: payload.content,
    date: new Date(payload.sentAt),
    own: payload.userId === auth.user?.id,
    read: true,
    mentionsMe,
    mentions,
  };
}

// --- STATE ---
interface TypingUser {
  userId: string;
  nickname: string;
  draft: string;
}

interface ChatState {
  channels: ChannelDto[];
  activeChannelId: string | null;
  messagesByChannel: Record<string, IMessage[]>;
  membersByChannel: Record<string, MemberDto[]>;
  typingUsersByChannel: Record<string, TypingUser[]>;
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
    typingUsersByChannel: {},
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

    activeTypingUsers(state): TypingUser[] {
      if (!state.activeChannelId) return [];
      return state.typingUsersByChannel[state.activeChannelId] ?? [];
    },
  },

  actions: {
    async fetchMessages(channelId: string) {
      if (!channelId) return;

      const auth = useAuthStore();

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
        this.channels = await socketService.listChannels();

        this.channels.forEach((c) => {
          if (c.lastMessage?.senderNick === auth.user?.nickname) {
            c.unreadCount = 0;
          }
        });

        console.log(`✅ ChatStore: Successfully loaded ${this.channels.length} channels.`);

        if (this.activeChannelId) {
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

        void this.fetchMessages(channelId);
        void this.fetchMembers(channelId);

        const channel = this.channels.find((c) => c.id === channelId);
        if (channel) {
          channel.unreadCount = 0;
          if (channel.isNew) channel.isNew = false;
        }
      }
    },

    async requestNotificationPermission() {
      if (!('Notification' in window)) return false;
      if (Notification.permission === 'granted') return true;

      console.log('🔔 ChatStore: Requesting notification permission...');
      const result = await Notification.requestPermission();
      return result === 'granted';
    },

    async sendSystemNotification(payload: NewMessageEvent) {
      const auth = useAuthStore();

      if (auth.settings?.status !== UserStatus.ONLINE) return;

      if (document.hasFocus()) {
        return;
      }

      if (!('Notification' in window)) return;

      if (Notification.permission === 'granted') {
        this.spawnNotification(payload);
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          this.spawnNotification(payload);
        }
      }
    },

    spawnNotification(payload: NewMessageEvent) {
      try {
        const title = payload.user?.nickname ?? 'New Message';
        const notification = new Notification(title, {
          body: payload.content,
          tag: `channel-${payload.channelId}`,
          silent: false,
        });

        notification.onclick = () => {
          window.focus();
          if (payload.channelId) {
            this.setActiveChannel(payload.channelId);
          }
          notification.close();
        };
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
        // 🔥 FIX: Використовуємо .catch() замість void, щоб уникнути no-floating-promises
        this.sendSystemNotification(payload).catch((err) => {
          console.error('Failed to send notification', err);
        });
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
        const members = this.membersByChannel[payload.channelId];
        if (members) {
          const exists = members.some((m) => m.id === payload.member.id);
          if (!exists) members.push(payload.member);
        }
      });

      socketService.onMemberLeft((payload: MemberLeftEvent) => {
        const members = this.membersByChannel[payload.channelId];
        if (members) {
          const index = members.findIndex((m) => m.id === payload.userId);
          if (index !== -1) members.splice(index, 1);
        }
      });

      socketService.onMemberKicked((payload: MemberLeftEvent) => {
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

      socketService.onTyping((payload: TypingEvent) => {
        console.debug(`[WS IN] Typing event: ${payload.nickname} in ${payload.channelId}`);

        // Don't show typing indicator for ourselves
        if (payload.userId === auth.user?.id) return;

        const typingUsers = (this.typingUsersByChannel[payload.channelId] ||= []);
        const existingIndex = typingUsers.findIndex((u) => u.userId === payload.userId);

        if (payload.isTyping) {
          const typingUser: TypingUser = {
            userId: payload.userId,
            nickname: payload.nickname,
            draft: payload.draft ?? '',
          };

          if (existingIndex !== -1) {
            typingUsers[existingIndex] = typingUser;
          } else {
            typingUsers.push(typingUser);
          }
        } else {
          if (existingIndex !== -1) {
            typingUsers.splice(existingIndex, 1);
          }
        }
      });

      socketService.onConnect(() => {
        console.log('✅ ChatStore: WS Connected.');
        this.connected = true;
        this.connecting = false;

        if (auth.settings?.status !== undefined) {
          console.log(`🔄 ChatStore: Restoring user status to ${auth.settings.status}...`);
          socketService.updateSettings({ status: auth.settings.status }).catch(console.error);
        }

        void this.loadChannels().then(() => {
          if (this.activeChannelId) {
            void this.fetchMessages(this.activeChannelId);
            void this.fetchMembers(this.activeChannelId);
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
        // 🔥 FIX: Прибрано використання any та зайву перевірку, оскільки socketService кидає помилку при невдачі
        await socketService.inviteUser(this.activeChannelId, nickname);
      } catch (error) {
        console.error('Failed to invite user:', error);
        throw error;
      }
    },

    async sendMessage(content: string) {
      if (!this.activeChannelId) return;

      const tempId = `temp-${Date.now()}`;
      const auth = useAuthStore();

      // Parse mentions from content to check if user mentions themselves
      const mentionRegex = /@([a-zA-Z0-9_]+)/g;
      const mentionedNicknames = [...content.matchAll(mentionRegex)].map((match) => match[1]);
      const mentionsMe = mentionedNicknames.includes(auth.nickname || '');

      const optimisticMessage: IMessage = {
        id: tempId,
        channelId: this.activeChannelId,
        sender: auth.nickname || 'You',
        text: content,
        date: new Date(),
        own: true,
        read: true,
        mentionsMe,
        mentions: [],
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
