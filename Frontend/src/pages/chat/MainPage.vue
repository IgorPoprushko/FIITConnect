<template>
  <div class="main-page-container">
    <!-- 🔥 ХЕДЕР КАНАЛУ (ВИВІСКА) -->
    <!-- Показуємо тільки якщо є активний канал -->
    <q-toolbar
      v-if="currentChannel"
      class="bg-primary text-white shadow-1 z-top"
      style="height: 60px; min-height: 60px"
    >
      <!-- ЛІВА ЧАСТИНА: Інформація про канал (Як у Telegram) -->
      <div class="row no-wrap items-center cursor-pointer q-mr-md" @click="toggleChatDrawer">
        <q-avatar size="40px" color="secondary" text-color="white" class="q-mr-sm">
          {{ currentChannel.name.charAt(0).toUpperCase() }}
        </q-avatar>

        <div class="column justify-center" style="line-height: 1.2">
          <div class="text-subtitle1 text-weight-bold row items-center q-gutter-xs">
            <span>{{ currentChannel.name }}</span>
            <q-icon
              v-if="currentChannel.type === ChannelType.PRIVATE"
              name="lock"
              size="xs"
              color="grey-4"
            />
          </div>
          <!-- Підзаголовок: кількість учасників -->
          <div class="text-caption text-grey-4">{{ members.length }} members</div>
        </div>
      </div>

      <q-space />

      <!-- ПРАВА ЧАСТИНА: Кнопки дій -->
      <div class="row q-gutter-sm items-center">
        <!-- ІНВАЙТ -->
        <q-btn flat round dense color="white" icon="person_add" @click="inviteDialog.open()">
          <q-tooltip>Invite users</q-tooltip>
        </q-btn>

        <!-- Покинути канал -->
        <q-btn flat round dense color="negative" icon="logout" @click="leaveDialog.open()">
          <q-tooltip>Leave channel</q-tooltip>
        </q-btn>

        <q-separator vertical spaced inset color="white" />

        <!-- 🔥 КНОПКА ДЕТАЛЕЙ ЧАТУ (Інфо) -->
        <q-btn flat round dense icon="info" @click="toggleChatDrawer">
          <q-tooltip>Channel Info</q-tooltip>
        </q-btn>
      </div>
    </q-toolbar>

    <!-- Основний контейнер повідомлень -->
    <div class="message-container bg-grey-2" v-if="currentChannel">
      <MessageList :messages="messages" :key="route.params.channelId?.toString() ?? ''" />
    </div>

    <!-- 🔥 EMPTY STATE (Якщо канал не вибрано) -->
    <div v-else class="column justify-center items-center full-height bg-primary text-grey-5">
      <q-icon name="chat_bubble_outline" size="100px" class="q-mb-md opacity-50" />
      <div class="text-h5 text-weight-light">Select a channel to start messaging</div>
      <div class="text-caption">Open the menu on the left to create or join a channel</div>
    </div>

    <!-- 🔥 ДІАЛОГ ПІДТВЕРДЖЕННЯ ВИХОДУ -->
    <FormDialog
      v-model="leaveDialog.isOpen.value"
      title="Leave Channel"
      confirm-color="negative"
      description="Do you want to leave channel?"
      confirm-label="Leave"
      :loading="leaveDialog.loading.value"
      @confirm="leaveChannel"
      @cancel="closeLeaveDialog"
      @close="closeLeaveDialog"
    >
    </FormDialog>

    <!-- 🔥 ДІАЛОГ ЗАПРОШЕННЯ (INVITE DIALOG) -->
    <FormDialog
      v-model="inviteDialog.isOpen.value"
      title="Invite User"
      confirm-label="Invite"
      confirm-color="secondary"
      :loading="inviteDialog.loading.value"
      :disable-confirm="!inviteNickname.trim()"
      @confirm="submitInvite"
      @cancel="closeInvite"
      @close="closeInvite"
    >
      <template #content>
        <q-input
          v-model="inviteNickname"
          label="User Nickname"
          dense
          outlined
          autofocus
          @keyup.enter="submitInvite"
          hint="Enter the exact nickname of the user"
        >
          <template v-slot:prepend>
            <q-icon name="person_search" />
          </template>
        </q-input>
      </template>
    </FormDialog>

    <!-- 🔥 ДІАЛОГ ІНФОРМАЦІЇ ПРО УЧАСНИКА -->
    <FormDialog
      v-model="memberInfoOpen"
      title="User Info"
      confirm-label=""
      cancel-label="Close"
      @cancel="memberInfoOpen = false"
      @close="memberInfoOpen = false"
    >
      <template #content>
        <div class="column items-center q-pb-md" v-if="selectedMember">
          <q-avatar size="100px" color="primary" text-color="white" class="q-mb-md shadow-3">
            {{ selectedMember.nickname.charAt(0).toUpperCase() }}
            <q-badge
              floating
              :color="getStatusColor(selectedMember.status)"
              rounded
              style="height: 20px; width: 20px; right: 6px; bottom: 6px"
            />
          </q-avatar>

          <div class="text-h5 text-weight-bold">
            {{ selectedMember.firstName }} {{ selectedMember.lastName }}
          </div>
          <div class="text-subtitle1 text-grey-7">@{{ selectedMember.nickname }}</div>

          <q-chip :color="getStatusColor(selectedMember.status)" text-color="white" class="q-mt-sm">
            {{ getStatusLabel(selectedMember.status) }}
          </q-chip>

          <q-list class="full-width q-mt-md" separator bordered style="border-radius: 8px">
            <q-item>
              <q-item-section avatar><q-icon name="schedule" color="grey" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Joined</q-item-label>
                <q-item-label>{{
                  new Date(selectedMember.joinedAt).toLocaleDateString()
                }}</q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedMember.lastSeenAt">
              <q-item-section avatar><q-icon name="visibility" color="grey" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Last seen</q-item-label>
                <q-item-label>{{
                  new Date(selectedMember.lastSeenAt).toLocaleString()
                }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </template>
    </FormDialog>

    <!-- 🔥 ПРАВИЙ DRAWER (ІНФО ПРО КАНАЛ ТА УЧАСНИКІВ) -->
    <q-drawer
      class="bg-dark text-white"
      v-model="chatDrawer"
      side="right"
      :width="320"
      bordered
      overlaybehavior="mobile"
    >
      <div v-if="currentChannel" class="column full-height">
        <!-- Секція інфо про канал -->
        <div class="column items-center q-pa-md bg-grey-10 border-bottom">
          <q-avatar size="80px" color="secondary" text-color="white" class="shadow-2 q-mb-sm">
            {{ currentChannel.name.charAt(0).toUpperCase() }}
          </q-avatar>
          <div class="text-h6 text-center">{{ currentChannel.name }}</div>
          <div class="text-caption text-grey-4 text-center q-mb-sm">
            {{ currentChannel.type === ChannelType.PRIVATE ? 'Private Channel' : 'Public Channel' }}
          </div>

          <div class="text-body2 text-grey-5 text-center q-px-sm" style="word-break: break-word">
            {{ currentChannel.description || 'No description provided.' }}
          </div>
        </div>

        <q-separator />

        <!-- Секція списку учасників -->
        <div class="col column">
          <q-item-label
            header
            class="text-weight-bold text-grey-7 q-py-md q-px-md row justify-between items-center"
          >
            <span>Members</span>
            <q-badge color="grey-4" text-color="black">{{ members.length }}</q-badge>
          </q-item-label>

          <q-scroll-area class="col">
            <q-list>
              <q-item
                v-for="member in members"
                :key="member.id"
                clickable
                v-ripple
                @click="openMemberInfo(member)"
              >
                <q-item-section avatar>
                  <q-avatar color="primary" text-color="white" size="40px">
                    {{ member.nickname.charAt(0).toUpperCase() }}
                    <!-- Індикатор статусу -->
                    <q-badge floating :color="getStatusColor(member.status)" rounded />
                  </q-avatar>
                </q-item-section>

                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ member.nickname }}</q-item-label>
                  <q-item-label caption :class="getStatusTextColor(member.status)">
                    {{ getStatusLabel(member.status) }}
                  </q-item-label>
                </q-item-section>

                <!-- Власник каналу -->
                <q-item-section side v-if="currentChannel.ownerUserId === member.id">
                  <q-icon name="star" color="amber" size="xs">
                    <q-tooltip>Owner</q-tooltip>
                  </q-icon>
                </q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>
        </div>
      </div>

      <!-- Заглушка, якщо немає каналу -->
      <div v-else class="column justify-center items-center full-height text-grey">
        <q-icon name="info" size="40px" />
        <div class="q-mt-sm">No channel details</div>
      </div>
    </q-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChatDrawer } from 'src/composables/useChatDrawer';
import MessageList from 'components/MessageList.vue';
import { useChatStore } from 'src/stores/chat';
import { ChannelType, UserStatus } from 'src/enums/global_enums';
import type { MemberDto } from 'src/contracts/channel_contracts'; // Імпорт типу учасника

import FormDialog from 'src/components/FormDialog.vue';
import { useFormDialog } from 'src/composables/useFormDialog';
import { socketService } from 'src/services/socketService';

const { chatDrawer, toggleChatDrawer } = useChatDrawer();
const chat = useChatStore();
const route = useRoute();
const router = useRouter();

const messages = computed(() => chat.activeMessages);
const currentChannel = computed(() => chat.activeChannel);
// 🔥 Отримуємо список учасників із стору (він автоматично оновлюється через fetchMembers)
const members = computed(() => chat.activeMembers);

// --- MEMBER DETAILS DIALOG ---
const memberInfoOpen = ref(false);
const selectedMember = ref<MemberDto | null>(null);

const openMemberInfo = (member: MemberDto) => {
  selectedMember.value = member;
  memberInfoOpen.value = true;
};

// --- HELPERS FOR STATUS ---
const getStatusColor = (status: UserStatus) => {
  switch (status) {
    case UserStatus.ONLINE:
      return 'positive'; // Зелений
    case UserStatus.DND:
      return 'negative'; // Червоний
    case UserStatus.OFFLINE:
      return 'grey-5'; // Сірий
    default:
      return 'grey';
  }
};

const getStatusTextColor = (status: UserStatus) => {
  switch (status) {
    case UserStatus.ONLINE:
      return 'text-positive';
    case UserStatus.DND:
      return 'text-negative';
    case UserStatus.OFFLINE:
      return 'text-grey-6';
    default:
      return 'text-grey';
  }
};

const getStatusLabel = (status: UserStatus) => {
  switch (status) {
    case UserStatus.ONLINE:
      return 'Online';
    case UserStatus.DND:
      return 'Do Not Disturb';
    case UserStatus.OFFLINE:
      return 'Offline';
    default:
      return 'Unknown';
  }
};

// --- INVITE LOGIC ---
const inviteDialog = useFormDialog();
const inviteNickname = ref('');

const closeInvite = () => {
  inviteDialog.close();
  inviteNickname.value = '';
};

const submitInvite = async () => {
  if (!inviteNickname.value.trim()) return;

  inviteDialog.setLoading(true);
  try {
    await chat.inviteUser(inviteNickname.value.trim());
  } finally {
    inviteDialog.setLoading(false);
    closeInvite();
  }
};
// --------------------

const syncChannelFromRoute = () => {
  const channelId = route.params.channelId as string | undefined;
  if (channelId) {
    chat.setActiveChannel(channelId);
  } else {
    chat.setActiveChannel(null);
  }
};

const handleGlobalKeydown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement;
  if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

  if (event.key === 'Escape' && currentChannel.value) {
    void router.push('/chat');
  }
};

onMounted(() => {
  syncChannelFromRoute();
  window.addEventListener('keydown', handleGlobalKeydown);
});

// 🔥 FIX: Використовуємо watch, щоб дочекатися підключення сокета
// Це виправляє проблему, коли onMounted MainPage спрацьовує раніше, ніж onMounted ChatLayout (де connectSocket)
watch(
  () => chat.connected,
  (isConnected) => {
    if (isConnected) {
      // Спочатку чистимо старі (щоб не було дублів, якщо сокет перепідключився)
      socketService.off('user:status:changed');

      // Підписуємось на оновлення статусів
      socketService.onUserStatusChanged((payload) => {
        const member = chat.activeMembers.find((m) => m.id === payload.userId);
        if (member) {
          member.status = payload.status;
        }
      });
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
  // Відписуємось від події статусу, щоб уникнути дублювання
  socketService.off('user:status:changed');
});

watch(
  () => route.params.channelId,
  () => {
    syncChannelFromRoute();
  },
);

// Form Dialog
const leaveDialog = useFormDialog();

const leaveChannel = async () => {
  if (!currentChannel.value) return;
  await chat.leaveChannel(currentChannel.value.id);
  await router.push('/chat');

  closeLeaveDialog();
};

const closeLeaveDialog = () => {
  leaveDialog.setLoading(false);
  leaveDialog.close();
};
</script>

<style scoped>
.main-page-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  overflow: hidden;
  position: relative;
}

.message-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.opacity-50 {
  opacity: 0.5;
}

.z-top {
  z-index: 10;
}

.border-bottom {
  border-bottom: 1px solid #e0e0e0;
}
</style>
