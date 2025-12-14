<template>
  <q-layout view="lHr LpR lFr">
    <q-drawer v-model="groupDrawer" side="left" show-if-above bordered class="q-pa-sm">
      <q-toolbar class="q-pa-none justify-between">
        <q-btn outline rounded color="secondary" class="text-bold" :label="auth.nickname"
          @click="profileDialog.open()" />
        <q-btn round flat dense icon="mail" class="q-ml-xs" />
      </q-toolbar>

      <q-toolbar class="q-pa-none">
        <q-input rounded standout dense clearable placeholder="Search" v-model="search" class="fit text-accent">
          <template v-slot:append>
            <q-icon name="search" color="secondary" />
          </template>
        </q-input>
        <q-btn round flat dense icon="add" class="q-ml-xs" @click="createDialog.open()" />
      </q-toolbar>

      <q-separator />

      <q-list>
        <GroupItem v-for="group in filteredGroups" :key="group.id" clickable :group-data="group"
          @select="selectChannel(group.id)" />
      </q-list>
    </q-drawer>

    <q-footer class="q-pa-none">
      <MessageInput :channel-type="activeChannel?.type ?? ChannelType.PUBLIC" :user-role="activeUserRole"
        @send="handleSend" />
    </q-footer>

    <FormDialog v-model="createDialog.isOpen.value" title="Create Channel" confirm-color="secondary"
      description="Create a new channel to start chatting with others" confirm-label="Create"
      :loading="createDialog.loading.value" :disable-confirm="!createForm.name.trim()" @confirm="submitCreate"
      @cancel="closeCreate" @close="closeCreate">
      <template #content>
        <q-form class="column q-gutter-md">
          <q-input v-model="createForm.name" label="Channel Name" color="secondary" dense outlined required
            :rules="[(val) => !!val?.trim() || 'Name is required']">
            <template v-slot:prepend> <q-icon name="tag" /> </template>
          </q-input>

          <q-input v-model="createForm.description" label="Description (optional)" type="textarea" color="secondary"
            autogrow dense outlined rows="2" max-rows="4">
            <template v-slot:prepend>
              <q-icon name="description" />
            </template>
          </q-input>

          <q-select v-model="createForm.type" :options="channelTypeOptions" label="Channel Type" color="secondary" dense
            outlined emit-value map-options>
            <template v-slot:prepend>
              <q-icon name="visibility" />
            </template>
          </q-select>
        </q-form>
      </template>
    </FormDialog>

    <FormDialog v-model="profileDialog.isOpen.value" title="User Profile" confirm-color="secondary"
      confirm-label="Apply" :loading="profileDialog.loading.value" :disable-confirm="checkChange()"
      @confirm="submitProfile" @cancel="closeProfile" @close="closeProfile">
      <template #content>
        <div class="column q-gutter-md">
          <div class="column q-gutter-sm q-pb-md">
            <div class="text-h4 text-weight-bold">{{ profileForm.nickname }}</div>

            <div class="row items-center justify-between">
              <div class="row items-center q-gutter-xs">
                <q-icon name="circle" :color="getStatusColor(profileForm.status)" size="12px" />

                <span class="text-caption text-grey-7">{{
                  statusDisplayMap[profileForm.status]
                }}</span>
              </div>

              <div class="column items-end">
                <span class="text-caption text-grey-6">Info not available</span>
              </div>
            </div>
          </div>

          <q-separator />

          <q-form class="column q-gutter-md q-pt-sm">
            <q-input v-model="profileForm.firstName" label="First Name" dense outlined color="secondary">
              <template v-slot:prepend>
                <q-icon name="person" color="secondary" />
              </template>
            </q-input>

            <q-input v-model="profileForm.lastName" label="Last Name" dense outlined color="secondary">
              <template v-slot:prepend>
                <q-icon name="person" color="secondary" />
              </template>
            </q-input>

            <q-input v-model="profileForm.email" label="Email" type="email" dense outlined color="secondary">
              <template v-slot:prepend>
                <q-icon name="email" color="secondary" />
              </template>
            </q-input>

            <q-select v-model="profileForm.status" :options="statusOptions" label="Status" dense outlined
              color="secondary" emit-value map-options>
              <template v-slot:prepend>
                <q-icon name="circle" :color="getStatusColor(profileForm.status)" />
              </template>

              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section avatar>
                    <q-icon name="circle" :color="getStatusColor(scope.opt.value)" size="12px" />
                  </q-item-section>

                  <q-item-section>
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-separator />
            <div class="justify-between row">
              <span class="content-center">Direct Notifications Only</span>
              <q-toggle v-model="profileForm.directNotificationsOnly" color="secondary" />
            </div>

            <q-btn outline rounded dense color="negative" label="Logout" class="text-h6 text-bold"
              @click="handleLogout" />
          </q-form>
        </div>
      </template>
    </FormDialog>

    <q-page-container> <router-view /> </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';

// === ІМПОРТИ КОНТРАКТІВ ===
import type { ChannelDto, JoinChannelPayload } from 'src/contracts/channel_contracts'; // <--- Додано JoinChannelPayload
import { ChannelType, UserRole, UserStatus } from 'src/enums/global_enums';
import type { UpdateSettingsPayload } from 'src/contracts/user_contracts';
// ==========================

import GroupItem from 'components/GroupItem.vue';
import FormDialog from 'src/components/FormDialog.vue';
import { useFormDialog } from 'src/composables/useFormDialog';
import { useAuthStore } from 'src/stores/auth';
import { useChatStore } from 'src/stores/chat';
import MessageInput from 'src/components/MessageInput.vue';
import { authService } from 'src/services/authService';

const router = useRouter();
const groupDrawer = ref(false);
const auth = useAuthStore();
const chat = useChatStore();
const search = ref<string>('');


// === ЛОКАЛЬНІ ТИПИ ===

// Тип для форми створення каналу
interface CreateFormPayload {
  name: string;
  description: string;
  type: ChannelType;
}

// Тип для відображення каналу у списку (GroupItem)
interface GroupItemProps {
  id: string;
  name: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
}

// Тип для форми профілю
interface ProfileFormPayload {
  email: string;
  firstName: string;
  lastName: string;
  nickname: string;
  status: UserStatus;
  directNotificationsOnly: boolean;
}

// === КОМП'ЮТЕРНІ ВЛАСТИВОСТІ ===

const activeChannel = computed(
  () => chat.channels.find((c: ChannelDto) => c.id === chat.activeChannelId) || null,
);
const activeUserRole = computed(() => {
  if (!auth.user || !chat.activeChannel) return UserRole.MEMBER;
  return chat.activeChannel.ownerUserId === auth.user.id ? UserRole.ADMIN : UserRole.MEMBER;
});

const normalizedSearch = computed(() => search.value.toLowerCase().trim());

const filteredGroups = computed(() =>
  chat.channels
    .filter((c: ChannelDto): c is ChannelDto => Boolean(c && c.name))
    .filter((c: ChannelDto) => c.name.toLowerCase().includes(normalizedSearch.value))
    .map(
      (c: ChannelDto): GroupItemProps => ({
        id: c.id,
        name: c.name,
        lastMessage: c.lastMessage?.content ?? '',
        lastTime: c.lastMessage?.sentAt
          ? new Date(c.lastMessage.sentAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
          : '',
        unreadCount: c.unreadCount,
      }),
    ),
);

//#region Create channel dialog
const createDialog = useFormDialog();
const createForm = reactive<CreateFormPayload>({
  name: '',
  description: '',
  type: ChannelType.PUBLIC,
});

const channelTypeOptions = [
  { label: 'Public', value: ChannelType.PUBLIC },
  { label: 'Private', value: ChannelType.PRIVATE },
];

// ВИПРАВЛЕНО: Прибираємо loadChannels з onMounted, оскільки він має викликатися після connectSocket
// Також прибираємо логіку setActiveChannel та hydrateMockMessages звідси.
onMounted(() => {
  // 1. Запускаємо процес з'єднання, який у своєму onConnect викликає loadChannels
  chat.connectSocket(); // 2. Логіка вибору активного каналу та завантаження повідомлень повинна бути у:
  //    - router.currentRoute (якщо в URL є ID)
  //    - обробнику chat.loadChannels, який викликається після успішного підключення.
});

async function selectChannel(channelId: string) {
  chat.setActiveChannel(channelId);
  await router.push(`/chat/${channelId}`);
}

const handleSend = (text: string) => {
  chat.sendMessage(text);
};

function closeCreate() {
  createDialog.close();
  createForm.name = '';
  createForm.description = '';
  createForm.type = ChannelType.PUBLIC;
}

async function submitCreate() {
  if (createForm.name.trim().length === 0) return;

  createDialog.setLoading(true);
  try {
    // ВИПРАВЛЕНО: Використовуємо імпортований JoinChannelPayload
    const joinPayload: JoinChannelPayload = {
      channelName: createForm.name, // isPrivate є опціональним, але ми його передаємо, якщо канал приватний
      isPrivate: createForm.type === ChannelType.PRIVATE,
    };

    const channel = await chat.createChannel(joinPayload);
    chat.setActiveChannel(channel.id);
    await router.push(`/chat/${channel.id}`);
    closeCreate();
  } catch (err) {
    console.error('Failed to create channel', err);
  } finally {
    createDialog.setLoading(false);
  }
}
//#endregion

//#region User profile dialog

// Мапінг для відображення ENUM-статусу
const statusDisplayMap: Record<UserStatus, string> = {
  [UserStatus.ONLINE]: 'Online',
  [UserStatus.DND]: 'DND',
  [UserStatus.OFFLINE]: 'Offline',
};

const profileDialog = useFormDialog();

// ВИПРАВЛЕНО: Використовуємо ProfileFormPayload
const profileForm = reactive<ProfileFormPayload>({
  email: auth.user?.email ?? '',
  firstName: auth.user?.firstName ?? '',
  lastName: auth.user?.lastName ?? '',
  nickname: auth.user?.nickname ?? '',
  status: auth.settings?.status ?? UserStatus.ONLINE,
  directNotificationsOnly: auth.settings?.directNotificationsOnly ?? false,
});

const statusOptions = [
  { label: statusDisplayMap[UserStatus.ONLINE], value: UserStatus.ONLINE },
  { label: statusDisplayMap[UserStatus.DND], value: UserStatus.DND },
  { label: statusDisplayMap[UserStatus.OFFLINE], value: UserStatus.OFFLINE },
];

function getStatusColor(status: UserStatus): string {
  switch (status) {
    case UserStatus.ONLINE:
      return 'green';
    case UserStatus.DND:
      return 'red';
    case UserStatus.OFFLINE:
      return 'grey';
    default:
      return 'grey';
  }
}

function checkChange() {
  return !(
    profileForm.email !== (auth.user?.email ?? '') ||
    profileForm.firstName !== (auth.user?.firstName ?? '') ||
    profileForm.lastName !== (auth.user?.lastName ?? '') ||
    profileForm.status !== (auth.settings?.status ?? UserStatus.ONLINE) ||
    profileForm.directNotificationsOnly !== (auth.settings?.directNotificationsOnly ?? false)
  );
}

function closeProfile() {
  profileDialog.close(); // Скидання полів форми до початкових значень
  profileForm.email = auth.user?.email ?? '';
  profileForm.firstName = auth.user?.firstName ?? '';
  profileForm.lastName = auth.user?.lastName ?? '';
  profileForm.nickname = auth.user?.nickname ?? '';
  profileForm.status = auth.settings?.status ?? UserStatus.ONLINE;
  profileForm.directNotificationsOnly = auth.settings?.directNotificationsOnly ?? false;
}

function submitProfile() {
  profileDialog.setLoading(true); // ВИКОРИСТОВУЄМО ІМПОРТОВАНИЙ UpdateSettingsPayload

  const updatePayload: UpdateSettingsPayload = {};
  let shouldUpdate = false; // ... (логіка оновлення даних та налаштувань) ...
  // 2. Зміни налаштувань

  if (profileForm.status !== (auth.settings?.status ?? UserStatus.ONLINE)) {
    updatePayload.status = profileForm.status;
    console.log('Change Status');
    shouldUpdate = true;
  }
  if (profileForm.directNotificationsOnly !== (auth.settings?.directNotificationsOnly ?? false)) {
    updatePayload.directNotificationsOnly = profileForm.directNotificationsOnly;
    console.log('Change Notification');
    shouldUpdate = true;
  }

  if (shouldUpdate && Object.keys(updatePayload).length > 0) {
    // TODO: Реалізувати updateSettings API call
    // Тут має бути виклик authService.updateSettings(updatePayload)
    // або socketService.updateSettings(updatePayload)
  }

  profileDialog.setLoading(false);
  closeProfile();
}
//#endregion

const handleLogout = async () => {
  await authService.logout();
  chat.disconnectSocket();
  await router.push('/login');
};
</script>
