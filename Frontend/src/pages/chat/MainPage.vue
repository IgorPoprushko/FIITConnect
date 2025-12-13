<template>
  <div class="main-page-container">
    <div class="message-container">
      <!-- 
        Ми прибрали ref="messageListRef", бо нам більше не треба
        смикати цей компонент за ниточки. Він самостійний.
      -->
      <MessageList :messages="messages" :key="route.params.channelId?.toString() ?? ''" />
    </div>

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
import { computed, watch, onMounted } from 'vue'; // Прибрали ref, nextTick, бо вони тут зайві
import { useRoute } from 'vue-router';
import { useChatDrawer } from 'src/composables/useChatDrawer';
import MessageList from 'components/MessageList.vue';
import { useChatStore } from 'src/stores/chat';

const { chatDrawer } = useChatDrawer();
const chat = useChatStore();

// 🔥 ПРИБРАЛИ: const messageListRef і interface MessageListExport
// Ми більше не ліземо в справи компонента MessageList.

const route = useRoute();

const messages = computed(() => chat.activeMessages);

const syncChannelFromRoute = () => {
  const channelId = route.params.channelId as string | undefined;
  if (channelId) {
    chat.setActiveChannel(channelId);
  }
};

onMounted(() => {
  syncChannelFromRoute();
});

// 🔥 ПРИБРАЛИ: watch на messages.value.length
// MessageList.vue сам слідкує за змінами і скролить.
// Тут цей код створював конфлікт і помилку.

watch(
  () => route.params.channelId,
  () => {
    syncChannelFromRoute();
  },
);
</script>

<style scoped>
.main-page-container {
  display: flex;
  height: calc(100vh - 60px); /* Adjust based on header height */
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
</style>
