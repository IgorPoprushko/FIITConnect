<template>
  <q-scroll-area class="messages-wrapper" ref="scrollAreaRef">
    <q-infinite-scroll reverse @load="onLoad" :offset="250" class="messages-scroll-area">
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
    </q-infinite-scroll>
  </q-scroll-area>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import MessageBubble from './MessageBubble.vue';
import { QScrollArea } from 'quasar';
import { type IMessage } from 'src/stores/chat'; // Імпортуємо IMessage зі стору

// Тип для функції Done (з Quasar Infinite Scroll)
type DoneFunction = (stop?: boolean) => void;

interface Props {
  messages: IMessage[]; // <-- ВИКОРИСТОВУЄМО IMessage
}
const props = defineProps<Props>();

// Змінна, що містить УСІ повідомлення, які прийшли зі стору (props)
const allMessages = computed<IMessage[]>(() => props.messages || []);

// currentMessages містить лише ті повідомлення, які ми вже відображаємо у скролі.
const currentMessages = ref<IMessage[]>([]);

// Посилання на QScrollArea
const scrollAreaRef = ref<InstanceType<typeof QScrollArea> | null>(null);

function onLoad(index: number, done: DoneFunction) {
  // Тут ти б викликав API: const oldMessages = await socketService.getMessages(channelId, currentMessages.value[0].id)

  setTimeout(() => {
    const loadedCount = currentMessages.value.length;

    // Кількість повідомлень, які ще не завантажені
    const remainingMessagesCount = allMessages.value.length - loadedCount;

    if (remainingMessagesCount <= 0) {
      done(true); // Зупиняємо нескінченний скрол
      return;
    }

    // Визначаємо, скільки нових повідомлень завантажити
    const batchSize = 20;
    const end = allMessages.value.length - loadedCount;
    // Починаємо з моменту, який на 20 повідомлень раніше від 'end'
    const start = Math.max(end - batchSize, 0);

    // Вирізаємо повідомлення, які потрібно завантажити (вони йдуть у зворотньому порядку, тому slice)
    const loadingMessages = allMessages.value.slice(start, end);

    // Додаємо їх на початок масиву (unshift, оскільки скрол reverse)
    currentMessages.value.unshift(...loadingMessages);

    done(); // Продовжуємо нескінченний скрол
  }, 500); // Зменшив таймаут для кращого UX
}

// Прокручування вниз
const scrollToBottom = async () => {
  // Нам потрібна прокрутка не QScrollArea, а контейнера, де знаходиться QInfiniteScroll
  // Оскільки ми використовуємо reverse, Quasar сам управляє скролом при завантаженні.
  // Тут ми просто забезпечуємо, що при *новій* ініціалізації ми внизу.
  await nextTick();
  const element = scrollAreaRef.value?.$el?.querySelector('.q-infinite-scroll');
  if (element) {
    // Прокрутка до останнього елемента
    element.scrollTop = element.scrollHeight;
  }
};

// Scroll to bottom on mount
onMounted(() => {
  // Встановлюємо початкові повідомлення для відображення
  currentMessages.value = allMessages.value.slice(-20);
  // ВИПРАВЛЕНО РЯДОК 94
  void nextTick(scrollToBottom);
});

// Expose method to scroll to bottom (for new messages)
defineExpose({
  scrollToBottom,
});

// 💡 Watcher: Оновлюємо, коли змінюється основний список повідомлень (наприклад, прийшло нове)
watch(
  allMessages,
  (newMessages, oldMessages) => {
    // Якщо список не змінився або тільки почав завантажуватися, ігноруємо
    if (!newMessages.length) return;

    const diff = newMessages.length - oldMessages.length;

    if (diff > 0) {
      // Прийшло нове повідомлення (або більше)
      const isUserAtBottom =
        scrollAreaRef.value?.$el?.scrollTop > scrollAreaRef.value?.$el?.scrollHeight - 500;

      // Додаємо нові повідомлення в кінець поточного списку
      currentMessages.value.push(...newMessages.slice(-diff));

      // Якщо юзер був близько до кінця, прокручуємо вниз
      if (isUserAtBottom) {
        // ВИПРАВЛЕНО РЯДОК 121
        void nextTick(scrollToBottom);
      }
    } else if (diff < 0) {
      // Завантаження нової історії (наприклад, зміна активного каналу)
      // Перезавантажуємо останні 20 повідомлень
      currentMessages.value = newMessages.slice(-20);
      // ВИПРАВЛЕНО РЯДОК 127
      void nextTick(scrollToBottom);
    }
  },
  { deep: true },
);
</script>

<style scoped>
/* Стилі залишаються без змін */
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
