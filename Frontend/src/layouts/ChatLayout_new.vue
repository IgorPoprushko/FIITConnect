<template>
    <q-layout view="lHr LpR lFr">
        <q-drawer v-model="groupDrawer" side="left" show-if-above bordered class="q-pa-sm">
            <!-- HEADER -->
            <q-toolbar class="q-pa-none justify-between">
                <!-- Current user nickname -->
                <q-btn :label="auth.nickname || auth.displayName" />
                <q-btn round flat dense icon="settings" class="q-ml-xs" />
            </q-toolbar>

            <!-- SEARCH -->
            <q-toolbar class="q-pa-none">
                <!-- Search input -->
                <q-input rounded standout dense clearable placeholder="Search" v-model="search" class="fit text-accent">
                    <template v-slot:append>
                        <q-icon name="search" color="secondary" />
                    </template>
                </q-input>
                <q-btn round flat dense icon="add" class="q-ml-xs" @click="openCreate" />
                <!-- Create channel dialog -->
                <q-dialog v-model="createDialog">
                    <q-card style="min-width: 320px">
                        <q-card-section>
                            <div class="text-h6">Create Channel</div>
                        </q-card-section>

                        <q-card-section>
                            <q-input v-model="form.name" label="Name" dense required />
                            <q-input v-model="form.description" label="Description" type="textarea" autogrow dense
                                class="q-mt-sm" />
                            <q-select v-model="typeOptions[0]" :options="typeOptions" label="Type" dense
                                class="q-mt-sm" />
                        </q-card-section>

                        <q-card-actions>
                            <q-btn flat label="Cancel" v-close-popup @click="closeCreate" />
                            <q-btn color="primary" label="Create" :loading="creating" @click="submitCreate" />
                        </q-card-actions>
                    </q-card>
                </q-dialog>
            </q-toolbar>

            <q-separator />

            <!--Groups-->
            <q-list>
                <GroupItem v-for="group in groups" :key="group.id" clickable :group-data="group" />
            </q-list>
        </q-drawer>

        <q-footer class="q-pa-none">
            <MessageInput />
        </q-footer>


        <!-- MAIN CONTENT -->
        <q-page-container>
            <router-view />
        </q-page-container>

    </q-layout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import GroupItem from 'components/GroupItem.vue'
import { useApi } from 'components/server/useApi'
import type { ChannelInfo, CreateChannelPayload } from 'src/types/channels'
import { useAuthStore } from 'src/stores/auth'
import MessageInput from 'src/components/MessageInput.vue';

const groupDrawer = ref(false);
const api = useApi()
const auth = useAuthStore();

const search = ref<string>('')

const groups = ref<Array<{
    id: string
    name: string
    lastMessage?: string
    unreadCount?: number
    lastTime?: string
}>>([])

// Create channel dialog state
const createDialog = ref(false)
const creating = ref(false)
const form = reactive<CreateChannelPayload>({ name: '', description: '', type: 'PUBLIC' })
const typeOptions = [
    { label: 'Public', value: 'PUBLIC' },
    { label: 'Private', value: 'PRIVATE' }
]

function openCreate() {
    createDialog.value = true
}

function closeCreate() {
    createDialog.value = false
    form.name = ''
    form.description = ''
    form.type = 'PUBLIC'
}
async function LoadChannels() {
    try {
        const channels: ChannelInfo[] = await api.getChannels();
        groups.value = (Array.isArray(channels) ? channels : []).map((c: ChannelInfo) => ({
            id: c.id,
            name: c.name ?? 'Unnamed',
            // use description as lastMessage fallback
            lastMessage: c.description ?? '',
            unreadCount: 0,
            lastTime: c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        }))
    }
    catch (err) {
        console.error('Failed to load channels', err)
    }
}

// Load channels from server on mount
onMounted(LoadChannels)

async function submitCreate() {
    if (form.name.trim().length === 0) return

    creating.value = true
    try {
        const created = await api.createChannel(form)
        // Map created channel to group item shape
        const item = {
            id: created.id,
            name: created.name,
            lastMessage: created.description ?? '',
            unreadCount: 0,
            lastTime: created.lastMessageAt ? new Date(created.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        }
        groups.value.unshift(item)
        LoadChannels();
        closeCreate();
    }
    catch (err) {
        console.error('Failed to create channel', err)
    }
    finally {
        creating.value = false
    }
}

</script>