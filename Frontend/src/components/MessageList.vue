<template>
  <q-scroll-area class="messages-wrapper" ref="scrollAreaRef">
    <q-infinite-scroll reverse @load="onLoad" :offset="250" class="messages-scroll-area">
      <template v-slot:loading>
        <div class="row justify-center q-my-md">
          <q-spinner-dots color="teal-5" name="dots" size="40px" />
        </div>
      </template>
      <MessageBubble
        v-for="(msg, i) in messages"
        :key="msg.id"
        :message="msg"
        :previousMessage="messages[i - 1]"
      />
    </q-infinite-scroll>
  </q-scroll-area>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';
import MessageBubble from './MessageBubble.vue';
import { QScrollArea } from 'quasar';
import { type IMessage } from 'src/stores/chat';

interface Props {
  messages: IMessage[];
}
const props = defineProps<Props>();

const scrollAreaRef = ref<QScrollArea | null>(null);

const onLoad = (index: number, done: (stop?: boolean) => void) => {
  setTimeout(() => {
    done(true);
  }, 1000);
};

const scrollToBottom = () => {
  const scrollArea = scrollAreaRef.value;
  if (scrollArea) {
    const scrollTarget = scrollArea.getScrollTarget();
    const scrollHeight = scrollTarget.scrollHeight;
    scrollArea.setScrollPosition('vertical', scrollHeight, 300);
  }
};

onMounted(() => {
  scrollToBottom();
});

watch(
  () => props.messages.length,
  () => {
    void nextTick(() => {
      scrollToBottom();
    });
  },
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
</style>
