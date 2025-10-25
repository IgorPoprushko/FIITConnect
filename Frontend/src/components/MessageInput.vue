<template>
  <div class="relative">
    <div class="row items-center q-pa-sm bg-dark">
      <q-btn class="q-mr-sm" round icon="attach_file" @click="handleAttach" />
      <q-btn class="q-mr-sm" round icon="emoji_emotions" @click="onEmojiClick" />
      <q-input
        v-model="messageText"
        placeholder="Type your message here..."
        class="chat-input col q-mx-md"
        dense
        borderless
        type="textarea"
        autogrow
        rows="1"
        max-rows="6"
        maxlength="1024"
        @update:model-value="onInputChange"
        @keydown="handleKeyDown"
      />
      <q-btn round icon="send" @click="handleSend" :disable="!messageText.trim()" />
    </div>
    <q-menu
      ref="commandMenu"
      v-model="showCommandMenu"
      no-focus
      anchor="bottom left"
      self="top left"
      :offset="[-8, 8]"
      transition-show="jump-down"
      transition-hide="jump-up"
    >
      <q-list v-if="filteredCommands.length" style="min-width: 200px">
        <q-item
          v-for="(cmd, index) in filteredCommands"
          :key="cmd.name"
          clickable
          @click="selectedCommand(cmd.name)"
          :active="index === selectedIndex"
        >
          <q-item-section>
            <span class="text-bold">{{ cmd.name }}</span>
            <div class="text-caption">{{ cmd.description }}</div>
            <div class="text-caption text-italic">Usage: {{ cmd.usage }}</div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';

const messageText = ref('');
const showCommandMenu = ref(false);
const commandMenu = ref();
const selectedIndex = ref(0);

// Define available commands
const commands = [
  { name: '/join', description: 'Join a channel', usage: '/join [channel_name]' },
  { name: '/invite', description: 'Invite a user to a channel', usage: '/invite [username]' },
  { name: '/revoke', description: 'Revoke a user from a channel', usage: '/revoke [username]' },
  { name: '/kick', description: 'Kick a user from a channel', usage: '/kick [username]' },
  { name: '/quit', description: 'Leave the current channel', usage: '/quit' },
  { name: '/list', description: 'List all users in the current channel', usage: '/list' },
];

// Compute filtered commands based on input
const filteredCommands = computed(() => {
  if (!messageText.value.startsWith('/')) return [];
  const query = messageText.value.toLowerCase();
  return commands.filter((cmd) => cmd.name.toLowerCase().startsWith(query));
});

// Update command menu visibility and position on input change
const onInputChange = async () => {
  showCommandMenu.value = messageText.value.startsWith('/');
  await nextTick();
  commandMenu.value?.updatePosition();
};

// Handle keyboard navigation in command menu
const handleKeyDown = (e: KeyboardEvent) => {
  if (!showCommandMenu.value) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % filteredCommands.value.length;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex.value =
      (selectedIndex.value - 1 + filteredCommands.value.length) % filteredCommands.value.length;
  } else if (e.key === 'Enter') {
    const cmd = filteredCommands.value[selectedIndex.value];
    if (cmd) {
      e.preventDefault();
      selectedCommand(cmd.name);
    }
  }
};

const selectedCommand = (cmdName: string) => {
  messageText.value = `${cmdName} `;
  showCommandMenu.value = false;
};

const emit = defineEmits<{
  (e: 'send', text: string): void;
}>();

const handleSend = () => {
  const text = messageText.value.trim();
  if (!text) return;

  emit('send', text);
  messageText.value = '';
};

const handleAttach = () => {
  // Placeholder for file attachment functionality
  console.log('Attach button clicked');
};

const onEmojiClick = () => {
  // Placeholder for emoji picker functionality
  console.log('Emoji picker clicked');
};
</script>

<style scoped>
.chat-input {
  max-height: 150px;
  overflow: auto;
}
.relative {
  position: relative;
}
.q-item--active {
  background-color: rgba(255, 255, 255, 0.15);
  color: turquoise;
  transition: background-color 0.2s;
}
</style>
