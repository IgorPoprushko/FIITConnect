<template>
  <div class="relative">
    <div class="row items-center q-pa-sm bg-dark">
      <q-input ref="inputRef" v-model="messageText" placeholder="Type your message here..." class="col q-mx-md" dense
        borderless type="textarea" autogrow rows="1" max-rows="6" maxlength="1024" @update:model-value="onInputChange"
        @keydown="handleKeyDown" />
      <q-btn round icon="send" @click="handleSend" :disable="!messageText.trim()" />
    </div>

    <!-- Suggestion Menu Component -->
    <SuggestionMenu ref="suggestionMenuRef" v-model="showSuggestionMenu" :query="currentSuggestionQuery"
      :context="commandContext" @select="handleSuggestionSelect" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';
import type { Suggestion, CommandContext } from 'src/types/suggestions';
import { UserRole } from 'src/types/user';
import { ChannelType } from 'src/types/channels';
import SuggestionMenu from 'components/SuggestionMenu.vue';
import { useCommandHandler } from 'src/composables/useCommandHandler';

interface Props {
  channelType?: ChannelType;
  userRole?: UserRole;
}

interface Emits {
  (e: 'send', text: string): void;
}

//TODO:Change for null
const props = withDefaults(defineProps<Props>(), {
  channelType: ChannelType.PUBLIC,
  userRole: UserRole.NORMAL,
});

const emit = defineEmits<Emits>();

const messageText = ref('');
const inputRef = ref();
const suggestionMenuRef = ref();
const showSuggestionMenu = ref(false);

// Initialize command handler for execution
const commandHandler = useCommandHandler() as ReturnType<typeof useCommandHandler> & {
  executeCommand: (commandText: string, context?: CommandContext) => Promise<boolean>;
};

// Command context for filtering available commands
const commandContext = computed<CommandContext>(() => ({
  channelType: props.channelType,
  userRole: props.userRole,
}));

// Get current suggestion query (text after trigger character)
const currentSuggestionQuery = computed<string>(() => {
  const text = messageText.value;
  const cursorPos = inputRef.value?.getNativeElement()?.selectionStart ?? text.length;

  // Find the last trigger character before cursor
  const textBeforeCursor = text.slice(0, cursorPos);
  const lastSlash = textBeforeCursor.lastIndexOf('/');
  const lastAt = textBeforeCursor.lastIndexOf('@');

  const triggerPos = Math.max(lastSlash, lastAt);

  if (triggerPos === -1) return '';

  // Get text from trigger to cursor
  const textFromTrigger = textBeforeCursor.slice(triggerPos);

  // Check if there's a space after the trigger (stop suggestions)
  if (textFromTrigger.includes(' ') && textFromTrigger.length > 1) {
    return '';
  }

  return textFromTrigger;
});

// Check if we should show suggestions
const shouldShowSuggestions = computed<boolean>(() => {
  const query = currentSuggestionQuery.value;

  // Must start with a trigger character
  if (!query.startsWith('/') && !query.startsWith('@')) {
    return false;
  }

  // Must not contain spaces (except right after trigger)
  if (query.includes(' ')) {
    return false;
  }

  return true;
});

// Update suggestion menu visibility
const onInputChange = async (): Promise<void> => {
  showSuggestionMenu.value = shouldShowSuggestions.value;

  if (showSuggestionMenu.value) {
    await nextTick();
    suggestionMenuRef.value?.updatePosition();
  }
};

// Handle keyboard events
const handleKeyDown = (e: KeyboardEvent): void => {
  // Handle Enter without suggestions
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
    return;
  }

  // When suggestions are shown, Enter and Escape have special behavior
  if (e.key === 'Escape' && showSuggestionMenu.value) {
    e.preventDefault();
    showSuggestionMenu.value = false;
  }
};

// Handle suggestion selection
const handleSuggestionSelect = (suggestion: Suggestion): void => {
  const text = messageText.value;
  const cursorPos = inputRef.value?.getNativeElement()?.selectionStart ?? text.length;

  // Find the trigger position
  const textBeforeCursor = text.slice(0, cursorPos);
  const lastSlash = textBeforeCursor.lastIndexOf('/');
  const lastAt = textBeforeCursor.lastIndexOf('@');
  const triggerPos = Math.max(lastSlash, lastAt);

  if (triggerPos === -1) return;

  // Replace the query with the selected suggestion
  const textBefore = text.slice(0, triggerPos);
  const textAfter = text.slice(cursorPos);

  // Get the replacement text (includes space at the end)
  let replacement = suggestion.value;
  if (suggestion.type === 'command') {
    replacement = `${suggestion.value} `;
  } else if (suggestion.type === 'mention') {
    replacement = `${suggestion.value} `;
  }

  messageText.value = textBefore + replacement + textAfter;

  // Set cursor position after the replacement
  nextTick(() => {
    const newCursorPos = (textBefore + replacement).length;
    const inputElement = inputRef.value?.getNativeElement();
    if (inputElement) {
      inputElement.setSelectionRange(newCursorPos, newCursorPos);
      inputElement.focus();
    }
  });

  showSuggestionMenu.value = false;
};

// Handle send message
const handleSend = async (): Promise<void> => {
  const text = messageText.value.trim();
  if (!text) return;

  // Check if it's a command
  if (text.startsWith('/')) {
    const success = await commandHandler.executeCommand(text, commandContext.value);
    if (success) {
      messageText.value = '';
      return;
    }
  }

  // Regular message
  emit('send', text);
  messageText.value = '';
};
</script>

<style scoped lang="scss">
.chat-input {
  max-height: 150px;
  overflow: auto;
}

.relative {
  position: relative;
}
</style>