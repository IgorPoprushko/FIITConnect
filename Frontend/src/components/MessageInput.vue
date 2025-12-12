<template>
  <div class="relative">
    <div class="row items-center q-pa-sm bg-dark">
      <q-input
        ref="inputRef"
        v-model="messageText"
        placeholder="Type your message here..."
        class="col q-mx-md"
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

    <SuggestionMenu
      ref="suggestionMenuRef"
      v-model="showSuggestionMenu"
      :query="currentSuggestionQuery"
      :context="commandContext"
      @select="handleSuggestionSelect"
    />
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

const props = withDefaults(defineProps<Props>(), {
  channelType: ChannelType.PUBLIC,
  userRole: UserRole.MEMBER,
});

const emit = defineEmits<Emits>();

const messageText = ref('');
const inputRef = ref();
const suggestionMenuRef = ref();
const showSuggestionMenu = ref(false);

const commandHandler = useCommandHandler() as ReturnType<typeof useCommandHandler> & {
  executeCommand: (commandText: string, context?: CommandContext) => Promise<boolean>;
};

const commandContext = computed<CommandContext>(() => ({
  channelType: props.channelType,
  userRole: props.userRole,
}));

const currentSuggestionQuery = computed<string>(() => {
  const text = messageText.value;
  const cursorPos = inputRef.value?.getNativeElement()?.selectionStart ?? text.length;

  const textBeforeCursor = text.slice(0, cursorPos);
  const lastSlash = textBeforeCursor.lastIndexOf('/');
  const lastAt = textBeforeCursor.lastIndexOf('@');

  const triggerPos = Math.max(lastSlash, lastAt);

  if (triggerPos === -1) return '';

  const textFromTrigger = textBeforeCursor.slice(triggerPos);

  if (textFromTrigger.includes(' ') && textFromTrigger.length > 1) {
    return '';
  }

  return textFromTrigger;
});

const shouldShowSuggestions = computed<boolean>(() => {
  const query = currentSuggestionQuery.value;
  if (!query.startsWith('/') && !query.startsWith('@')) return false;
  if (query.includes(' ')) return false;
  return true;
});

const onInputChange = async (): Promise<void> => {
  showSuggestionMenu.value = shouldShowSuggestions.value;

  if (showSuggestionMenu.value) {
    await nextTick();
    suggestionMenuRef.value?.updatePosition();
  }
};

const handleKeyDown = (e: KeyboardEvent): void => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    // ФІКС 1: Додаємо void, щоб ігнорувати проміс від handleSend
    void handleSend();
    return;
  }

  if (e.key === 'Escape' && showSuggestionMenu.value) {
    e.preventDefault();
    showSuggestionMenu.value = false;
  }
};

const handleSuggestionSelect = (suggestion: Suggestion): void => {
  const text = messageText.value;
  const cursorPos = inputRef.value?.getNativeElement()?.selectionStart ?? text.length;

  const textBeforeCursor = text.slice(0, cursorPos);
  const lastSlash = textBeforeCursor.lastIndexOf('/');
  const lastAt = textBeforeCursor.lastIndexOf('@');
  const triggerPos = Math.max(lastSlash, lastAt);

  if (triggerPos === -1) return;

  const textBefore = text.slice(0, triggerPos);
  const textAfter = text.slice(cursorPos);

  let replacement = suggestion.value;
  if (suggestion.type === 'command' || suggestion.type === 'mention') {
    replacement = `${suggestion.value} `;
  }

  messageText.value = textBefore + replacement + textAfter;

  // ФІКС 2: Додаємо void для nextTick
  void nextTick(() => {
    const newCursorPos = (textBefore + replacement).length;
    const inputElement = inputRef.value?.getNativeElement();
    if (inputElement) {
      inputElement.setSelectionRange(newCursorPos, newCursorPos);
      inputElement.focus();
    }
  });

  showSuggestionMenu.value = false;
};

const handleSend = async (): Promise<void> => {
  const text = messageText.value.trim();
  if (!text) return;

  if (text.startsWith('/')) {
    const success = await commandHandler.executeCommand(text, commandContext.value);
    if (success) {
      messageText.value = '';
      return;
    }
  }

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
