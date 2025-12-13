<template>
  <q-scroll-area class="messages-wrapper" ref="scrollAreaRef">
    <!-- 
      Використовуємо reverse для скролу вгору. 
      @load - викликається, коли юзер скролить до верху (для завантаження історії)
    -->
    <q-infinite-scroll reverse @load="onLoad" :offset="250" class="messages-scroll-area">
      <template v-slot:loading>
        <div class="row justify-center q-my-md">
          <q-spinner-dots color="primary" name="dots" size="40px" />
        </div>
      </template>

      <!-- 
        🔥 ГОЛОВНИЙ ФІКС: Ми рендеримо props.messages НАПРЯМУ!
        Жодних локальних currentMessages. Якщо в сторі щось змінилось - воно миттєво тут.
      -->
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

// Функція завантаження історії (Infinite Scroll)
// ВИПРАВЛЕНО: Явно вказуємо типи аргументів, замість використання неправильного типу DoneFunction
const onLoad = (index: number, done: (stop?: boolean) => void) => {
  // index - номер "сторінки" завантаження (1, 2, 3...)
  // done - функція, яку треба викликати, коли ми закінчили (true = стоп, більше не грузити)

  // Тут ти пізніше додаш логіку: emit('loadMore') або chatStore.loadMore()
  // Поки що просто завершуємо завантаження
  setTimeout(() => {
    done(true); // true означає "більше немає даних", зміниш коли буде API історії
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

// Скролимо вниз при першому завантаженні
onMounted(() => {
  scrollToBottom();
});

// 🔥 Слідкуємо за кількістю повідомлень
// Як тільки приходить нове (або "оптимістичне"), ми скролимо вниз.
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
