<template>
  <q-item
    clickable
    v-ripple
    :active="isActive"
    active-class="bg-blue-grey-10 text-white"
    class="q-px-sm q-py-md group-item"
    @click="$emit('select', id)"
  >
    <q-item-section avatar class="q-pr-sm" style="min-width: 0">
      <q-avatar color="cyan-10" text-color="white" size="48px" class="shadow-1">
        {{ name.charAt(0).toUpperCase() }}
      </q-avatar>
    </q-item-section>

    <q-item-section>
      <div class="row items-center justify-between no-wrap">
        <div class="row items-center no-wrap ellipsis text-weight-bold text-subtitle1 q-mr-xs">
          <q-icon v-if="isPrivate" name="lock" size="14px" color="grey-6" class="q-mr-xs" />
          <span class="ellipsis">{{ name }}</span>
        </div>

        <div class="text-caption text-grey-5 q-ml-sm" style="white-space: nowrap; font-size: 11px">
          {{ formattedTime }}
        </div>
      </div>

      <div class="row items-center justify-between no-wrap q-mt-xs">
        <div
          class="text-body2 text-grey-5 truncate col q-pr-sm"
          style="font-size: 13px; max-width: 211px"
        >
          <span v-if="lastSender" class="text-blue-grey-6 text-weight-medium"
            >{{ lastSender }}:
          </span>
          <span>{{ lastMessage || 'No messages yet' }}</span>
        </div>

        <q-badge
          v-if="unreadCount > 0"
          color="green-6"
          :label="unreadCount > 99 ? '99+' : unreadCount"
          class="q-pt-xs"
        />
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  id: string;
  name: string;
  isPrivate: boolean;
  lastMessage: string;
  lastSender?: string;
  lastTime: string | Date | null;
  unreadCount: number;
  isActive: boolean;
}>();

defineEmits(['select']);

const formattedTime = computed(() => {
  if (!props.lastTime) return '';
  const date = new Date(props.lastTime);

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});
</script>

<style scoped>
.group-item {
  border-bottom: 1px solid #3f3f3f;
  transition: background-color 0.2s;
}

.truncate {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
