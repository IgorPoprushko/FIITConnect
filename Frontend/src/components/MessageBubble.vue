<template>
  <q-chat-message
    text-color="white"
    :label="getNextDay(previousMessage)"
    :name="message.sender"
    :text="[message.text]"
    :stamp="getTime(message.date)"
    :sent="message.own"
    :bg-color="message.own ? 'primary' : 'secondary'"
    class="q-mb-sm q-px-sm message-item"
  />
</template>

<script setup lang="ts">
// ВИПРАВЛЕНО: Імпортуємо IMessage з Pinia Store, де він був перевизначений
import { type IMessage } from 'src/stores/chat';

interface Props {
  message: IMessage;
  previousMessage: IMessage | undefined;
}
const props = defineProps<Props>();

// Ми можемо використовувати props.message напряму без окремої змінної
// const message = props.message;

function getNextDay(prevMessage: IMessage | undefined): string {
  const dateLable = props.message.date.toDateString(); // Використовуємо props.message
  // Перевіряємо, чи є попереднє повідомлення або чи це інший день

  if (prevMessage == undefined || prevMessage.date.toDateString() !== dateLable) return dateLable;
  else return '';
}

function getTime(date: Date) {
  // Форматуємо час (наприклад, 14:46)
  return date.toTimeString().slice(0, 5);
}
</script>

<style>
.message-item {
  max-width: 1150px;
  margin: auto auto;
}
</style>
