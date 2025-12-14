<template>
  <transition name="fade">
    <div v-if="typingUsers.length > 0" class="typing-indicator q-px-md q-py-xs">
      <q-btn flat dense no-caps class="typing-text" @click="showDialog = true">
        <span class="text-grey-6">
          {{ typingText }}
        </span>
      </q-btn>
    </div>
  </transition>

  <q-dialog v-model="showDialog">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">{{ dialogTitle }}</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <div class="typing-draft-content">
          {{ currentDraft }}
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Close" color="primary" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

interface TypingUser {
  userId: string;
  nickname: string;
  draft: string;
}

interface Props {
  typingUsers: TypingUser[];
}

const props = defineProps<Props>();

const showDialog = ref(false);

const typingText = computed(() => {
  if (props.typingUsers.length === 0) return '';
  if (props.typingUsers.length === 1) {
    return `${props.typingUsers[0]?.nickname} is typing...`;
  }
  if (props.typingUsers.length === 2) {
    return `${props.typingUsers[0]?.nickname} and ${props.typingUsers[1]?.nickname} are typing...`;
  }
  return `${props.typingUsers[0]?.nickname} and ${props.typingUsers.length - 1} others are typing...`;
});

const dialogTitle = computed(() => {
  if (props.typingUsers.length === 1) {
    return `${props.typingUsers[0]?.nickname} is typing`;
  }
  return 'Multiple users typing';
});

const currentDraft = computed(() => {
  if (props.typingUsers.length === 0) return '';
  // Show the first user's draft
  return props.typingUsers[0]?.draft || 'Typing...';
});

// Close dialog when all users stop typing
watch(
  () => props.typingUsers.length,
  (newLength) => {
    if (newLength === 0) {
      showDialog.value = false;
    }
  },
);
</script>

<style scoped>
.typing-indicator {
  min-height: 30px;
  background-color: var(--q-dark);
}

.typing-text {
  font-size: 0.875rem;
  padding: 0;
  text-transform: none;
}

.typing-draft-content {
  min-height: 60px;
  padding: 12px;
  background-color: var(--q-dark);
  border-radius: 4px;
  color: var(--q-primary);
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
