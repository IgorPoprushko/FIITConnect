<template>
  <q-chat-message
    text-color="white"
    :label="dateLabel"
    :name="shouldShowName ? message.sender : undefined"
    :text="[message.text]"
    :stamp="getTime(message.date)"
    :sent="message.own"
    :bg-color="getBgColor"
    :class="['q-mb-sm', 'q-px-sm', 'message-item', { 'mentioned-message': message.mentionsMe }]"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { type IMessage } from 'src/stores/chat';

interface Props {
  message: IMessage;
  previousMessage: IMessage | undefined;
}
const props = defineProps<Props>();

// 1. Логіка дати (День): показуємо, тільки якщо змінився день
const dateLabel = computed(() => {
  const currentDateStr = props.message.date.toDateString();

  // Якщо попереднього немає — це початок історії, показуємо дату
  if (!props.previousMessage) return currentDateStr;

  const prevDateStr = props.previousMessage.date.toDateString();
  // Якщо дати різні — показуємо нову дату
  return prevDateStr !== currentDateStr ? currentDateStr : undefined;
});

// 2. 🔥 ГОЛОВНИЙ ФІКС: Розумне відображення імені
const shouldShowName = computed(() => {
  // Якщо це перше повідомлення взагалі — показуємо
  if (!props.previousMessage) return true;

  // Якщо змінився день (ми показали лейбл дати) — показуємо ім'я знову для ясності
  if (dateLabel.value) return true;

  // Якщо змінився автор повідомлення — точно показуємо
  if (props.previousMessage.sender !== props.message.sender) return true;

  // (Опціонально) Якщо між повідомленнями пройшло більше 5 хвилин —
  // вважаємо це новим "блоком" розмови і нагадуємо, хто пише.
  const timeDiff = props.message.date.getTime() - props.previousMessage.date.getTime();
  if (timeDiff > 5 * 60 * 1000) return true;

  // В усіх інших випадках (той самий автор, той самий час) — ховаємо ім'я
  return false;
});

// 3. Background color based on mention status
const getBgColor = computed(() => {
  if (props.message.mentionsMe) {
    return 'amber-8'; // Highlighted color for mentions
  }
  return props.message.own ? 'primary' : 'secondary';
});

function getTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.mentioned-message {
  animation: pulse-mention 1s ease-in-out;
}

@keyframes pulse-mention {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
</style>
