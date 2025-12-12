<template>
  <q-scroll-area class="messages-wrapper">
    <!-- Infinite scroll for old messages-->
    <q-infinite-scroll
      reverse
      @load="onLoad"
      :offset="250"
      class="messages-scroll-area"
      ref="scrollAreaRef"
    >
      <template v-slot:loading>
        <div class="row justify-center q-my-md">
          <q-spinner-dots color="primary" name="dots" size="40px" />
        </div>
      </template>

      <MessageBubble
        v-for="(msg, i) in currentMessages"
        :key="msg.id"
        :message="msg"
        :previousMessage="currentMessages[i - 1]"
      />

      <!-- <q-chat-message text-color="white" v-for="(message, index) in messages" :key="message.id"
                :label="isNewDay(index) ? message.date : ''" :name="message.name" :avatar="message.avatar"
                :text="[message.text]" :stamp="message.time" :sent="message.isMine"
                :bg-color="message.isMine ? 'primary' : 'secondary'" class="q-mb-sm q-px-sm message-item" /> -->
    </q-infinite-scroll>
  </q-scroll-area>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import MessageBubble from './MessageBubble.vue';
import { type IMessage, type DoneFunction } from 'src/types/messages';
import { QScrollArea } from 'quasar';

interface Props {
  messages: IMessage[];
}
const props = defineProps<Props>();
const messages = computed<IMessage[]>(() => props.messages || []);
const currentMessages = ref<IMessage[]>([]);

const scrollAreaRef = ref<InstanceType<typeof QScrollArea> | null>(null);

function onLoad(index: number, done: DoneFunction) {
  setTimeout(() => {
    const allMessages = messages.value;
    const loadedCount = currentMessages.value.length;
    const end = allMessages.length - loadedCount;
    if (end <= 0) {
      done(true);
      return;
    }
    const start = Math.max(end - 5, 0);

    const loadingMessages = allMessages.slice(start, end);
    currentMessages.value.unshift(...loadingMessages);
    done();
  }, 1500);
}

// Scroll to bottom on mount
onMounted(async () => {
  await nextTick();
  scrollToBottom();
});

const scrollToBottom = () => {
  if (scrollAreaRef.value?.$el) {
    const scrollContainer = scrollAreaRef.value.$el;
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }
};

// Expose method to scroll to bottom (for new messages)
defineExpose({
  scrollToBottom,
});

watch(
  () => messages.value.length,
  async () => {
    currentMessages.value = [...messages.value.slice(-20)];
    await nextTick();
    scrollToBottom();
  }
);
</script>

<style scoped>
.messages-wrapper {
  height: 100%;
  width: 100%;
  background-color: var(--q-color-dark);
  display: flex;
  flex-direction: column;
}

.messages-scroll-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  padding-left: max(20px, env(safe-area-inset-left));
  padding-right: max(20px, env(safe-area-inset-right));
}

/* Custom scrollbar styling */
.messages-scroll-area::-webkit-scrollbar {
  width: 8px;
}

.messages-scroll-area::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
}

.messages-scroll-area::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.messages-scroll-area::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>
