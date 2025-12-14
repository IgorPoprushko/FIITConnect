<template>
  <q-chat-message
    text-color="white"
    :label="dateLabel"
    :name="shouldShowName ? message.sender : undefined"
    :text="[message.text]"
    :stamp="getTime(message.date)"
    :sent="message.own"
    :bg-color="getBgColor"
    :class="[
      'q-mb-sm',
      'q-px-sm',
      'message-item',
      {
        'mentioned-message': message.mentionsMe,
        'mentioned-message--own': message.mentionsMe && message.own,
      },
    ]"
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

const dateLabel = computed(() => {
  const currentDateStr = props.message.date.toDateString();

  if (!props.previousMessage) return currentDateStr;

  const prevDateStr = props.previousMessage.date.toDateString();
  return prevDateStr !== currentDateStr ? currentDateStr : undefined;
});

const shouldShowName = computed(() => {
  if (!props.previousMessage) return true;

  if (dateLabel.value) return true;

  if (props.previousMessage.sender !== props.message.sender) return true;

  const timeDiff = props.message.date.getTime() - props.previousMessage.date.getTime();
  if (timeDiff > 5 * 60 * 1000) return true;

  return false;
});

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

.mentioned-message :deep(.q-message-container) {
  background: linear-gradient(315deg, #121212 25%, #ffa00044 100%) !important;
}

.mentioned-message--own :deep(.q-message-container) {
  background: linear-gradient(135deg, #121212 25%, #ffa00044 100%) !important;
}

@keyframes pulse-mention {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.8;
  }
}
</style>
