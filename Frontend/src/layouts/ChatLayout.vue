<template>
  <q-layout view="lHr LpR lFr">
    <q-drawer v-model="groupDrawer" side="left" show-if-above bordered class="q-pa-xs column">
      <!-- 🔥 НОВИЙ ХЕДЕР ПРОФІЛЮ -->
      <div class="q-pa-sm">
        <q-item
          clickable
          v-ripple
          style="background: #353739; border-radius: 40px"
          class="q-mb-sm"
          @click="profileDialog.open()"
        >
          <!-- Аватарка з індикатором статусу -->
          <q-item-section avatar>
            <q-avatar color="primary" text-color="white" size="40px" font-size="18px">
              {{ auth.nickname ? auth.nickname.charAt(0).toUpperCase() : '?' }}

              <!-- Індикатор статусу -->
              <q-badge
                floating
                rounded
                :color="getStatusColor(auth.settings?.status ?? UserStatus.ONLINE)"
                style="right: -2px; bottom: -2px; top: auto"
              />
            </q-avatar>
          </q-item-section>

          <!-- Текстова частина: Нікнейм та Статус -->
          <q-item-section>
            <q-item-label class="text-weight-bold text-subtitle2 ellipsis">
              {{ auth.nickname }}
            </q-item-label>
            <q-item-label
              caption
              :class="getStatusTextColor(auth.settings?.status ?? UserStatus.ONLINE)"
            >
              {{ getStatusLabel(auth.settings?.status ?? UserStatus.ONLINE) }}
            </q-item-label>
          </q-item-section>

          <!-- Іконка налаштувань -->
          <q-item-section side>
            <q-icon name="settings" size="xs" color="grey-6" />
          </q-item-section>
        </q-item>

        <!-- Пошук та кнопка створення -->
        <q-toolbar class="q-pa-none">
          <q-input
            rounded
            standout
            dense
            clearable
            placeholder="Search"
            v-model="search"
            class="fit text-accent"
          >
            <template v-slot:append>
              <q-icon name="search" color="secondary" />
            </template>
          </q-input>
          <q-btn round flat dense icon="add" class="q-ml-xs" @click="createDialog.open()">
            <q-tooltip>Create Channel</q-tooltip>
          </q-btn>
        </q-toolbar>
      </div>

      <q-separator />

      <!-- Скрол-зона для списків -->
      <q-scroll-area class="col">
        <!-- 🔥 СЕКЦІЯ НОВИХ ЗАПРОШЕНЬ -->
        <div v-if="newGroups.length > 0" class="q-pa-xs">
          <q-item-label
            header
            class="text-weight-bold text-green q-pb-none row items-center q-mb-sm"
          >
            <q-avatar size="24px" color="green" text-color="white" icon="mail" class="q-mr-sm" />
            New Invitations
          </q-item-label>

          <q-list class="q-mt-sm q-mb-md">
            <GroupItem
              v-for="group in newGroups"
              :key="group.id"
              clickable
              v-bind="group"
              @select="(id) => void selectChannel(id)"
              class="bg-grey-9"
            />
          </q-list>

          <q-separator />
        </div>

        <!-- 🔥 СЕКЦІЯ ЗВИЧАЙНИХ КАНАЛІВ -->
        <div class="q-pa-xs">
          <q-item-label
            header
            v-if="regularGroups.length > 0"
            class="text-weight-bold text-grey-7 q-pb-none row items-center q-mb-sm"
          >
            <q-avatar size="22px" color="grey-7" text-color="white" icon="groups" class="q-mr-sm" />
            Channels
          </q-item-label>

          <q-list class="q-mt-xs">
            <GroupItem
              v-for="group in regularGroups"
              :key="group.id"
              clickable
              v-bind="group"
              @select="(id) => void selectChannel(id)"
            />
          </q-list>
        </div>
      </q-scroll-area>
    </q-drawer>

    <q-footer class="q-pa-none">
      <TypingIndicator :typing-users="chat.activeTypingUsers" />
      <MessageInput
        :channel-type="activeChannel?.type ?? null"
        :user-role="activeUserRole ?? null"
        @send="handleSend"
      />
    </q-footer>

    <FormDialog
      v-model="createDialog.isOpen.value"
      title="Create Channel"
      confirm-color="secondary"
      description="Create a new channel to start chatting with others"
      confirm-label="Create"
      :loading="createDialog.loading.value"
      :disable-confirm="!createForm.name.trim()"
      @confirm="submitCreate"
      @cancel="closeCreate"
      @close="closeCreate"
    >
      <template #content>
        <q-form class="column q-gutter-md">
          <q-input
            v-model="createForm.name"
            label="Channel Name"
            color="secondary"
            dense
            outlined
            required
            :rules="[(val) => !!val?.trim() || 'Name is required']"
          >
            <template v-slot:prepend> <q-icon name="tag" /> </template>
          </q-input>

          <q-input
            v-model="createForm.description"
            label="Description (optional)"
            type="textarea"
            color="secondary"
            autogrow
            dense
            outlined
            rows="2"
            max-rows="4"
          >
            <template v-slot:prepend>
              <q-icon name="description" />
            </template>
          </q-input>

          <q-select
            v-model="createForm.type"
            :options="channelTypeOptions"
            label="Channel Type"
            color="secondary"
            dense
            outlined
            emit-value
            map-options
          >
            <template v-slot:prepend>
              <q-icon name="visibility" />
            </template>
          </q-select>
        </q-form>
      </template>
    </FormDialog>

    <FormDialog
      v-model="profileDialog.isOpen.value"
      title="User Profile"
      confirm-color="secondary"
      confirm-label="Apply"
      :loading="profileDialog.loading.value"
      :disable-confirm="checkChange()"
      @confirm="submitProfile"
      @cancel="closeProfile"
      @close="closeProfile"
    >
      <template #content>
        <div class="column q-gutter-md">
          <div class="column q-gutter-sm q-pb-md">
            <!-- Великий аватар в профілі -->
            <div class="row justify-center q-mb-sm">
              <q-avatar size="80px" color="primary" text-color="white" class="shadow-3">
                {{ profileForm.nickname.charAt(0).toUpperCase() }}
                <q-badge
                  floating
                  :color="getStatusColor(profileForm.status)"
                  rounded
                  style="right: 2px; bottom: 2px; width: 20px; height: 20px"
                />
              </q-avatar>
            </div>

            <div class="text-h5 text-weight-bold text-center">{{ profileForm.nickname }}</div>
            <div class="text-caption text-grey-6 text-center">{{ profileForm.email }}</div>
          </div>

          <q-separator />

          <q-form class="column q-gutter-md q-pt-sm">
            <q-input
              v-model="profileForm.firstName"
              label="First Name"
              dense
              outlined
              color="secondary"
            >
              <template v-slot:prepend>
                <q-icon name="person" color="secondary" />
              </template>
            </q-input>

            <q-input
              v-model="profileForm.lastName"
              label="Last Name"
              dense
              outlined
              color="secondary"
            >
              <template v-slot:prepend>
                <q-icon name="person" color="secondary" />
              </template>
            </q-input>

            <q-input
              v-model="profileForm.email"
              label="Email"
              type="email"
              dense
              outlined
              color="secondary"
            >
              <template v-slot:prepend>
                <q-icon name="email" color="secondary" />
              </template>
            </q-input>

            <q-select
              v-model="profileForm.status"
              :options="statusOptions"
              label="Status"
              dense
              outlined
              color="secondary"
              emit-value
              map-options
            >
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
            <div class="justify-between row items-center">
              <span class="content-center">Direct Notifications Only</span>
              <q-toggle v-model="profileForm.directNotificationsOnly" color="secondary" />
            </div>

            <q-btn
              outline
              rounded
              dense
              color="negative"
              label="Logout"
              class="text-bold q-mt-md"
              @click="() => void handleLogout()"
            />
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
import type { ChannelDto, JoinChannelPayload } from 'src/contracts/channel_contracts';
import { ChannelType, UserRole, UserStatus } from 'src/enums/global_enums';
// ==========================

import GroupItem from 'components/GroupItem.vue';
import FormDialog from 'src/components/FormDialog.vue';
import { useFormDialog } from 'src/composables/useFormDialog';
import { useAuthStore } from 'src/stores/auth';
import { useChatStore } from 'src/stores/chat';
import MessageInput from 'src/components/MessageInput.vue';
import TypingIndicator from 'src/components/TypingIndicator.vue';
import { authService } from 'src/services/authService';
import { socketService } from 'src/services/socketService';

const router = useRouter();
const groupDrawer = ref(false);
const auth = useAuthStore();
const chat = useChatStore();
const search = ref<string>('');

// === ЛОКАЛЬНІ ТИПИ ===

interface CreateFormPayload {
  name: string;
  description: string;
  type: ChannelType;
}

interface GroupItemProps {
  id: string;
  name: string;
  isPrivate: boolean;
  lastMessage: string;
  lastSender?: string;
  lastTime: string | Date | null;
  unreadCount: number;
  isActive: boolean;
  isNew: boolean;
}

interface ProfileFormPayload {
  email: string;
  firstName: string;
  lastName: string;
  nickname: string;
  status: UserStatus;
  directNotificationsOnly: boolean;
}

// === HELPER FUNCTIONS FOR STATUS ===
function getStatusColor(status: UserStatus): string {
  switch (status) {
    case UserStatus.ONLINE:
      return 'positive';
    case UserStatus.DND:
      return 'negative';
    case UserStatus.OFFLINE:
      return 'grey-5';
    default:
      return 'grey';
  }
}

function getStatusLabel(status: UserStatus): string {
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
}

function getStatusTextColor(status: UserStatus): string {
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

// 1. Спочатку фільтруємо та мапимо все
const allFilteredGroups = computed(() =>
  chat.channels
    .filter((c: ChannelDto): c is ChannelDto => Boolean(c && c.name))
    .filter((c: ChannelDto) => c.name.toLowerCase().includes(normalizedSearch.value))
    .map(
      (c: ChannelDto): GroupItemProps => ({
        id: c.id,
        name: c.name,
        isPrivate: c.type === ChannelType.PRIVATE,
        lastMessage: c.lastMessage?.content ?? '',
        lastSender: c.lastMessage?.senderNick ?? '',
        lastTime: c.lastMessage?.sentAt ? new Date(c.lastMessage.sentAt) : null,
        unreadCount: c.unreadCount,
        isActive: c.id === chat.activeChannelId,
        isNew: c.isNew,
      }),
    ),
);

// 2. Секція "New Invitations": Тільки isNew === true
const newGroups = computed(() =>
  allFilteredGroups.value
    .filter((g) => g.isNew)
    .sort((a, b) => {
      const timeA = a.lastTime ? new Date(a.lastTime).getTime() : 0;
      const timeB = b.lastTime ? new Date(b.lastTime).getTime() : 0;
      // 🔥 Стабільне сортування: якщо час однаковий, сортуємо за назвою
      return timeB - timeA || a.name.localeCompare(b.name);
    }),
);

// 3. Секція "Channels": Тільки isNew === false
const regularGroups = computed(() =>
  allFilteredGroups.value
    .filter((g) => !g.isNew)
    .sort((a, b) => {
      // Сортуємо звичайні по часу останнього повідомлення
      const timeA = a.lastTime ? new Date(a.lastTime).getTime() : 0;
      const timeB = b.lastTime ? new Date(b.lastTime).getTime() : 0;
      // 🔥 Стабільне сортування: якщо час однаковий, сортуємо за назвою
      return timeB - timeA || a.name.localeCompare(b.name);
    }),
);

//region Create channel dialog
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

onMounted(() => {
  chat.connectSocket();
});

async function selectChannel(channelId: string) {
  // 🔥 Миттєве переміщення: знаходимо канал в сторі і ставимо isNew = false
  const channelInStore = chat.channels.find((c) => c.id === channelId);
  if (channelInStore && channelInStore.isNew) {
    channelInStore.isNew = false;
  }

  chat.setActiveChannel(channelId);
  await router.push(`/chat/${channelId}`);
}

const handleSend = async (text: string) => {
  await chat.sendMessage(text);
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
    const joinPayload: JoinChannelPayload = {
      channelName: createForm.name,
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

const statusDisplayMap: Record<UserStatus, string> = {
  [UserStatus.ONLINE]: 'Online',
  [UserStatus.DND]: 'DND',
  [UserStatus.OFFLINE]: 'Offline',
};

const profileDialog = useFormDialog();

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
  profileDialog.close();
  // Reset values to store values
  profileForm.email = auth.user?.email ?? '';
  profileForm.firstName = auth.user?.firstName ?? '';
  profileForm.lastName = auth.user?.lastName ?? '';
  profileForm.nickname = auth.user?.nickname ?? '';
  profileForm.status = auth.settings?.status ?? UserStatus.ONLINE;
  profileForm.directNotificationsOnly = auth.settings?.directNotificationsOnly ?? false;
}

async function submitProfile() {
  profileDialog.setLoading(true);

  try {
    // 1. ОНОВЛЕННЯ НАЛАШТУВАНЬ (SOCKET)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settingsPayload: any = {};
    let settingsChanged = false;
    const wasOffline = auth.settings?.status === UserStatus.OFFLINE;

    if (profileForm.status !== (auth.settings?.status ?? UserStatus.ONLINE)) {
      settingsPayload.status = profileForm.status;
      settingsChanged = true;
    }
    if (profileForm.directNotificationsOnly !== (auth.settings?.directNotificationsOnly ?? false)) {
      settingsPayload.directNotificationsOnly = profileForm.directNotificationsOnly;
      settingsChanged = true;
    }

    if (settingsChanged) {
      // Send update via socket
      const newSettings = await socketService.updateSettings(settingsPayload);

      // 🔥 FIX: Викликаємо auth.setSettings, щоб зберегти в localStorage
      auth.setSettings(newSettings);

      // Також оновлюємо вкладений об'єкт у user, якщо він існує
      if (auth.user) {
        auth.user.settings = newSettings;
        auth.setUser(auth.user); // Це оновить і localStorage['user']
      }

      // If we switched FROM Offline TO Online/DND, fetch latest channels
      if (wasOffline && newSettings.status !== UserStatus.OFFLINE) {
        console.log('Switched from OFFLINE to ONLINE -> Refreshing channels...');
        await chat.loadChannels();
      }
    }

    // 2. ОНОВЛЕННЯ ПРОФІЛЮ (ІМ'Я, ПРІЗВИЩЕ, EMAIL)
    // Перевіряємо, чи змінились дані профілю
    const profileChanged =
      profileForm.firstName !== (auth.user?.firstName ?? '') ||
      profileForm.lastName !== (auth.user?.lastName ?? '') ||
      profileForm.email !== (auth.user?.email ?? '');

    if (profileChanged) {
      // Б) Відправляємо на сервер через WebSocket (так надійніше)
      try {
        const updatedUser = await socketService.updateProfile({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          email: profileForm.email,
        });
        console.log('Profile updated on server via WebSocket');

        // А) Оновлюємо локальний store ПРАВИЛЬНО (через setUser)
        if (auth.user) {
          auth.setUser(updatedUser);
        }
      } catch (err) {
        console.error('Failed to update profile on server:', err);
      }
    }

    closeProfile();
  } catch (error) {
    console.error('Failed to update settings:', error);
  } finally {
    profileDialog.setLoading(false);
  }
}
//#endregion

const handleLogout = async () => {
  try {
    await authService.logout();
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    chat.disconnectSocket();
    await router.push('/login').catch(() => {});
  }
};
</script>
