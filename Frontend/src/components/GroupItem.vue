<template>
    <q-item clickable @click="emit('select')">
        <q-item-section class="column">
            <div class="text-weight-medium">{{ groupData.name }}</div>
            <div class="text-grey-5 ellipsis" style="max-width: 200px">{{ groupData.lastMessage }}</div>
        </q-item-section>

        <q-item-section side class="items-center">
            <div class="column items-end">
                <div class="text-caption text-grey-5">{{ groupData.lastTime }}</div>
                <q-badge v-if="(groupData.unreadCount ?? 0) > 0" :label="groupData.unreadCount" color="green"
                    class="q-mt-sm" />
            </div>
        </q-item-section>
    </q-item>
</template>

<script setup lang="ts">
interface GroupData {
    id?: string
    name: string
    lastMessage?: string
    unreadCount?: number
    lastTime?: string
}

const props = defineProps<{ groupData: GroupData }>()
const emit = defineEmits<{ (e: 'select'): void }>()
const { groupData } = props
</script>
