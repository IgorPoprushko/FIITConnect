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
              color="grey"
            />
          </div>
          <!-- Підзаголовок: учасники або опис -->
          <div class="text-caption text-grey-7">
            {{ currentChannel.description || 'No members info' }}
          </div>
        </div>
      </div>

      <q-space />
      <!-- Цей елемент штовхає все, що нижче, вправо -->

      <!-- ПРАВА ЧАСТИНА: Кнопки дій -->
      <div class="row q-gutter-sm items-center">
        <!-- Інвайт -->
        <q-btn flat round dense color="grey-7" icon="person_add" @click="onInvite">
          <q-tooltip>Invite users</q-tooltip>
        </q-btn>

        <!-- Покинути канал -->
        <q-btn flat round dense color="negative" icon="logout" @click="confirmLeave = true">
          <q-tooltip>Leave channel</q-tooltip>
        </q-btn>

        <q-separator vertical spaced inset />

        <!-- Меню (Профіль/Налаштування) -->
        <q-btn flat round dense icon="menu" @click="toggleChatDrawer" />
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
    <q-dialog v-model="confirmLeave" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm"
            >Are you sure you want to leave <b>{{ currentChannel?.name }}</b
            >?</span
          >
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn flat label="Leave" color="negative" @click="onLeaveChannel" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Правий Drawer (Профіль) -->
    <q-drawer class="q-pa-md bg-primary" v-model="chatDrawer" side="right" :width="300" bordered>
      <div class="text-center q-mb-md">
        <q-avatar size="80px">
          <img src="https://cdn.quasar.dev/img/avatar2.jpg" alt="User" />
        </q-avatar>
        <div class="text-h6 q-mt-sm">Profile</div>
        <div class="text-caption">Online</div>
      </div>

      <q-separator spaced />

      <q-list>
        <q-item clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="info" />
          </q-item-section>
          <q-item-section>About</q-item-section>
        </q-item>
        <q-item clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="settings" />
          </q-item-section>
          <q-item-section>Settings</q-item-section>
        </q-item>
        <q-item clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="logout" color="negative" />
          </q-item-section>
          <q-item-section class="text-negative">Logout</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>
  </div>
</template>

<script setup lang="ts">
// 🔥 ДОДАНО: import onUnmounted
import { computed, watch, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChatDrawer } from 'src/composables/useChatDrawer';
import MessageList from 'components/MessageList.vue';
import { useChatStore } from 'src/stores/chat';
import { useQuasar } from 'quasar';
import { ChannelType } from 'src/enums/global_enums';

const { chatDrawer, toggleChatDrawer } = useChatDrawer();
const chat = useChatStore();
const route = useRoute();
const router = useRouter();
const $q = useQuasar();

const confirmLeave = ref(false);

const messages = computed(() => chat.activeMessages);

const currentChannel = computed(() => chat.activeChannel);

const syncChannelFromRoute = () => {
  const channelId = route.params.channelId as string | undefined;
  if (channelId) {
    chat.setActiveChannel(channelId);
  } else {
    chat.setActiveChannel(null); // Скидаємо, якщо немає ID
  }
};

// --- ФУНКЦІЯ ДЛЯ ОБРОБКИ НАТИСКАННЯ КЛАВІШ ---
const handleGlobalKeydown = (event: KeyboardEvent) => {
  // 1. FIX: Перевіряємо, чи ми не друкуємо в цей момент
  // Якщо фокус у полі вводу (input або textarea), ігноруємо ESC (бо користувач може хотіти просто скасувати ввід)
  const target = event.target as HTMLElement;
  if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

  // 2. Якщо натиснуто ESC і ми зараз у відкритому каналі (не на порожній сторінці)
  if (event.key === 'Escape' && currentChannel.value) {
    // 3. FIX: Йдемо на '/chat', а не на '/', бо '/' кидає на Login
    void router.push('/chat');
  }
};

onMounted(() => {
  syncChannelFromRoute();
  // 🔥 ВІШАЄМО СЛУХАЧ (Вуха)
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  // 🔥 ЗНІМАЄМО СЛУХАЧ, коли йдемо зі сторінки, щоб не засмічувати пам'ять
  window.removeEventListener('keydown', handleGlobalKeydown);
});

watch(
  () => route.params.channelId,
  () => {
    syncChannelFromRoute();
  },
);

const onInvite = () => {
  $q.notify({
    message: 'Invite feature coming soon!',
    color: 'info',
    icon: 'person_add',
  });
};

const onLeaveChannel = async () => {
  if (!currentChannel.value) return;

  const channelName = currentChannel.value.name;

  try {
    // 1. Чекаємо виконання виходу (async)
    await chat.leaveChannel(currentChannel.value.id);

    $q.notify({
      message: `You left ${channelName}`,
      color: 'positive',
      icon: 'check',
    });

    // 2. FIX: Додали await і змінили шлях на /chat
    await router.push('/chat');
  } catch {
    // 3. FIX: Прибрали (error), бо ми його не використовуємо (no-unused-vars)
    $q.notify({
      message: 'Failed to leave channel',
      color: 'negative',
      icon: 'error',
    });
  }
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
</style>
