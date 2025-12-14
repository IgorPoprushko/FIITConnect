<template>
  <transition name="slide-up">
    <div v-if="typingUsers.length > 0" class="typing-indicator-container q-px-md q-py-xs">
      <div
        class="typing-pill row items-center no-wrap shadow-2 cursor-pointer"
        @click="showDialog = true"
        v-ripple
      >
        <div class="row q-mr-sm" style="margin-left: -4px">
          <div
            v-for="(user, index) in enrichedTypingUsers.slice(0, 3)"
            :key="user.userId"
            class="relative-position avatar-stack"
            :style="{ zIndex: 10 - index, marginLeft: index > 0 ? '-8px' : '0' }"
          >
            <q-avatar size="24px" color="primary" text-color="white" class="shadow-1">
              <span class="text-weight-bold" style="font-size: 12px">
                {{ user.nickname.charAt(0).toUpperCase() }}
              </span>

              <q-badge floating rounded :color="getStatusColor(user.status)" class="status-badge" />
            </q-avatar>
            <q-tooltip>{{ user.nickname }}</q-tooltip>
          </div>

          <div
            v-if="typingUsers.length > 3"
            class="avatar-stack flex flex-center bg-grey-9 text-white"
            style="
              width: 24px;
              height: 24px;
              border-radius: 50%;
              margin-left: -8px;
              z-index: 5;
              font-size: 10px;
              border: 2px solid #292929;
            "
          >
            +{{ typingUsers.length - 3 }}
          </div>
        </div>

        <div class="row items-center">
          <span class="text-caption text-grey-4 q-mr-xs text-weight-medium">
            {{ typingText }}
          </span>
          <q-spinner-dots size="1.2em" color="primary" />
        </div>
      </div>
    </div>
  </transition>

  <q-dialog v-model="showDialog">
    <q-card style="min-width: 350px" class="bg-dark text-white">
      <q-card-section class="row items-center">
        <div class="text-h6">{{ dialogTitle }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup color="white" />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-list separator dark>
          <q-item v-for="user in typingUsers" :key="user.userId">
            <q-item-section avatar>
              <q-avatar color="primary" text-color="white" size="sm">
                {{ user.nickname.charAt(0).toUpperCase() }}
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-bold">{{ user.nickname }}</q-item-label>
              <q-item-label
                caption
                class="typing-draft-content bg-grey-9 text-grey-4 q-pa-sm rounded-borders"
              >
                {{ user.draft || 'Typing...' }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useChatStore } from 'src/stores/chat';
import { UserStatus } from 'src/enums/global_enums';

interface TypingUser {
  userId: string;
  nickname: string;
  draft: string;
}

interface Props {
  typingUsers: TypingUser[];
}

const props = defineProps<Props>();
const chatStore = useChatStore();
const showDialog = ref(false);

const enrichedTypingUsers = computed(() => {
  return props.typingUsers.map((u) => {
    const member = chatStore.activeMembers.find((m) => m.id === u.userId);
    return {
      ...u,
      status: member ? member.status : UserStatus.ONLINE,
    };
  });
});

const typingText = computed(() => {
  const count = props.typingUsers.length;
  if (count === 0) return '';

  const user1 = props.typingUsers[0];
  const user2 = props.typingUsers[1];

  if (count === 1 && user1) {
    return `${user1.nickname} is typing`;
  }
  if (count === 2 && user1 && user2) {
    return `${user1.nickname} & ${user2.nickname} are typing`;
  }
  return `${count} people are typing`;
});

const dialogTitle = computed(() => {
  const user1 = props.typingUsers[0];
  return props.typingUsers.length === 1 && user1 ? `${user1.nickname} is typing...` : 'Live Drafts';
});

const currentDraft = computed(() => {
  if (props.typingUsers.length === 0) return '';
  return props.typingUsers[0]?.draft || 'Typing...';
});

// Helper functions
const getStatusColor = (status: UserStatus) => {
  switch (status) {
    case UserStatus.ONLINE:
      return 'positive';
    case UserStatus.DND:
      return 'negative';
    case UserStatus.OFFLINE:
      return 'grey-6';
    default:
      return 'grey';
  }
};

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
.typing-indicator-container {
  width: 100%;
  pointer-events: none;
}

.typing-pill {
  display: inline-flex;
  background-color: #292929;
  border-radius: 20px;
  padding: 4px 12px 4px 8px;
  border: 1px solid #424242;
  pointer-events: auto;
  transition: all 0.2s ease;
}

.typing-pill:hover {
  background-color: #383838;
  transform: translateY(-1px);
}

.avatar-stack {
  border: 2px solid #292929;
  border-radius: 50%;
  transition: margin-left 0.2s;
}

.status-badge {
  border: 1.5px solid #292929;
  box-sizing: content-box;
  right: -2px;
  bottom: -2px;
  width: 6px;
  height: 6px;
  padding: 0;
  min-height: unset;
}

.typing-draft-content {
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
