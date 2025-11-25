<template>
    <q-layout view="lHr LpR lFr">
        <q-drawer v-model="groupDrawer" side="left" show-if-above bordered class="q-pa-sm">
            <!-- HEADER -->
            <q-toolbar class="q-pa-none justify-between">
                <q-btn outline rounded color="secondary" class="text-bold" :label="auth.nickname" />
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
                <q-btn round flat dense icon="add" class="q-ml-xs" @click="createDialog.open()" />
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

        <FormDialog v-model="createDialog.isOpen.value" title="Create Channel" confirm-color="secondary"
            description="Create a new channel to start chatting with others" confirm-label="Create"
            :loading="createDialog.loading.value" :disable-confirm="!form.name.trim()" @confirm="submitCreate"
            @cancel="closeCreate" @close="closeCreate">
            <template #content>
                <q-form class="column q-gutter-md">
                    <q-input v-model="form.name" label="Channel Name" color="secondary" dense outlined required
                        :rules="[val => !!val?.trim() || 'Name is required']">
                        <template v-slot:prepend>
                            <q-icon name="tag" />
                        </template>
                    </q-input>

                    <q-input v-model="form.description" label="Description (optional)" type="textarea" color="secondary"
                        autogrow dense outlined rows="2" max-rows="4">
                        <template v-slot:prepend>
                            <q-icon name="description" />
                        </template>
                    </q-input>

                    <q-select v-model="form.type" :options="typeOptions" label="Channel Type" color="secondary" dense
                        outlined emit-value map-options>
                        <template v-slot:prepend>
                            <q-icon name="visibility" />
                        </template>
                    </q-select>
                </q-form>
            </template>
        </FormDialog>

        <FormDialog v-model="createDialog.isOpen.value" title="Create Channel" confirm-color="secondary"
            description="Create a new channel to start chatting with others" confirm-label="Create"
            :loading="createDialog.loading.value" :disable-confirm="!form.name.trim()" @confirm="submitCreate"
            @cancel="closeCreate" @close="closeCreate">
            <template #content>
                <q-form class="column q-gutter-md">
                    <q-input v-model="form.name" label="Channel Name" color="secondary" dense outlined required
                        :rules="[val => !!val?.trim() || 'Name is required']">
                        <template v-slot:prepend>
                            <q-icon name="tag" />
                        </template>
                    </q-input>

                    <q-input v-model="form.description" label="Description (optional)" type="textarea" color="secondary"
                        autogrow dense outlined rows="2" max-rows="4">
                        <template v-slot:prepend>
                            <q-icon name="description" />
                        </template>
                    </q-input>

                    <q-select v-model="form.type" :options="typeOptions" label="Channel Type" color="secondary" dense
                        outlined emit-value map-options>
                        <template v-slot:prepend>
                            <q-icon name="visibility" />
                        </template>
                    </q-select>
                </q-form>
            </template>
        </FormDialog>

        <!-- MAIN CONTENT -->
        <q-page-container>
            <router-view />
        </q-page-container>

    </q-layout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import GroupItem from 'components/GroupItem.vue'
import FormDialog from 'src/components/FormDialog.vue'
import { useFormDialog } from 'src/composables/useFormDialog'
import { useApi } from 'components/server/useApi'
import type { ChannelVisual, CreateChannelPayload } from 'src/types/channels'
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

//#region Create channel dialog
const createDialog = useFormDialog();
const form = reactive<CreateChannelPayload>({ name: '', description: '', type: 0 });

const typeOptions = [
    { label: 'Public', value: 0 },
    { label: 'Private', value: 1 }
];

function closeCreate() {
    createDialog.close();
    form.name = ''
    form.description = ''
    form.type = 0
}

async function LoadChannels() {
    try {
        const channels: ChannelVisual[] = await api.getChannels();
        groups.value = (Array.isArray(channels) ? channels : []).map((c: ChannelVisual) => ({
            id: c.id,
            name: c.name,
            lastMessage: c.lastMessage || "",
            lastTime: c.lastMessageAt ? c.lastMessageAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            unreadCount: c.newMessagesCount,
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

    createDialog.setLoading(true)
    try {
        const created = await api.createChannel(form)
        // Map created channel to group item shape
        const item = {
            id: created.id,
            name: created.name,
            lastMessage: created.lastMessage || "",
            unreadCount: created.newMessagesCount,
            lastTime: created.lastMessageAt ? created.lastMessageAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        }
        groups.value.unshift(item)
        closeCreate();
    }
    catch (err) {
        console.error('Failed to create channel', err)
    }
    finally {
        createDialog.setLoading(false)
    }
}
//#endregion

//#region User profile dialog

//#endregion
</script>