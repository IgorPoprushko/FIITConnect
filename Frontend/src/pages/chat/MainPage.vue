<template>
  <div class="main-page-container">
    <div class="message-container">
      <MessageList ref="messageListRef" :messages="messages" />
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
      </q-list>
    </q-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useChatDrawer } from 'src/composables/useChatDrawer';
import MessageList from 'components/MessageList.vue';
import { useChatStore } from 'src/stores/chat';

// Описуємо структуру компонента, щоб TS не кастив його в 'any'
interface MessageListExport {
  scrollToBottom: () => void;
}

const { chatDrawer } = useChatDrawer();
const chat = useChatStore();

// ФІКС: тепер тут немає any, і лінтер задоволений
const messageListRef = ref<MessageListExport | null>(null);

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

watch(
  () => messages.value.length,
  async () => {
    await nextTick();
    messageListRef.value?.scrollToBottom();
  },
);

watch(
  () => route.params.channelId,
  () => {
    syncChannelFromRoute();
  },
);
</script>

<style scoped>
.main-page-container {
  height: 93vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.message-container {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.chat-input-footer {
  flex-shrink: 0;
  z-index: 10;
  width: 100%;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
