<template>
  <q-menu
    ref="menuRef"
    v-model="showMenu"
    no-focus
    :target="target"
    anchor="bottom left"
    self="top left"
    :offset="offset"
    transition-show="jump-down"
    transition-hide="jump-up"
  >
    <q-list v-if="suggestions.length" style="min-width: 250px; max-height: 300px" class="scroll">
      <q-item
        v-for="(suggestion, index) in suggestions"
        :key="`${suggestion.type}-${suggestion.value}`"
        clickable
        @click="handleSelect(suggestion)"
        :active="index === selectedIndex"
        class="suggestion-item"
      >
        <q-item-section v-if="suggestion.type === 'command'">
          <q-item-label class="text-bold text-primary">{{ suggestion.label }}</q-item-label>
          <q-item-label caption class="text-grey-7">{{ suggestion.description }}</q-item-label>
          <q-item-label caption class="text-grey-6 text-italic">{{
            suggestion.usage
          }}</q-item-label>
        </q-item-section>

        <q-item-section v-if="suggestion.type === 'mention'">
          <q-item-label class="text-bold">@{{ suggestion.label }}</q-item-label>
          <q-item-label caption :class="isUserOnline(suggestion) ? 'text-positive' : 'text-grey-6'">
            {{ suggestion.description }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import type {
  Suggestion,
  SuggestionHandler,
  MentionSuggestion,
  CommandContext,
} from 'src/types/suggestions';
import { useCommandHandler } from 'src/composables/useCommandHandler';
import { useMentionHandler } from 'src/composables/useMentionHandler';
import { UserStatus } from 'src/enums/global_enums'; // <-- ІМПОРТОВАНО: Для перевірки статусу

interface Props {
  modelValue: boolean;
  query: string;
  context?: CommandContext;
  target?: boolean | string;
  offset?: [number, number];
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'select', suggestion: Suggestion): void;
  (e: 'updatePosition'): void;
}

const props = withDefaults(defineProps<Props>(), {
  target: true,
  offset: () => [-8, 8],
});

const emit = defineEmits<Emits>();

const menuRef = ref();
const selectedIndex = ref(0);

// Initialize handlers
const commandHandler = useCommandHandler();
const mentionHandler = useMentionHandler();

// Compute which handler to use based on query
const activeHandler = computed<SuggestionHandler | null>(() => {
  if (props.query.startsWith(commandHandler.trigger)) {
    return commandHandler;
  }
  if (props.query.startsWith(mentionHandler.trigger)) {
    return mentionHandler;
  }
  return null;
});

// Get suggestions from active handler
const suggestions = computed<Suggestion[]>(() => {
  if (!activeHandler.value) return [];

  // Remove trigger character for search
  const query = props.query.slice(1);
  return activeHandler.value.getSuggestions(query, props.context);
});

// Two-way binding for menu visibility
const showMenu = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

/**
 * ПЕРЕВІРКА СТАТУСУ ОНЛАЙН
 * Використовуємо UserStatus, оскільки isOnline відсутній у UserDto.
 */
const isUserOnline = (suggestion: Suggestion): boolean => {
  if (suggestion.type === 'mention') {
    // Ми впевнені, що тут MentionSuggestion, тому робимо припущення типу
    const userStatus = (suggestion as MentionSuggestion).user.status;

    // Вважаємо ONLINE або, можливо, AWAY активним статусом.
    // Примітка: якщо у вас є окремий статус OFFLINE, перевіряйте на UserStatus.ONLINE
    return userStatus === UserStatus.ONLINE;
  }
  return false;
};

// Reset selected index when suggestions change
watch(suggestions, () => {
  selectedIndex.value = 0;
});

// Update menu position when it opens
watch(showMenu, async (newVal) => {
  if (newVal) {
    await nextTick();
    menuRef.value?.updatePosition();
    emit('updatePosition');
  }
});

const handleSelect = (suggestion: Suggestion): void => {
  emit('select', suggestion);
  showMenu.value = false;
};

// Expose methods for parent component
defineExpose({
  updatePosition: () => menuRef.value?.updatePosition(),
});
</script>

<style scoped lang="scss">
.suggestion-item {
  &.q-item--active {
    background-color: rgba(var(--q-primary-rgb), 0.15);
    transition: background-color 0.2s;
  }

  &:hover {
    background-color: rgba(var(--q-primary-rgb), 0.1);
  }
}

.online-badge {
  top: auto;
  bottom: 2px;
  right: 2px;
}
</style>
