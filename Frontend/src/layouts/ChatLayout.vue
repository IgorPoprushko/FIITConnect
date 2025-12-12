<template>
    <q-layout view="lHr LpR lFr">
        <q-drawer v-model="groupDrawer" side="left" show-if-above bordered class="q-pa-sm">
            <!-- HEADER -->
            <q-toolbar class="q-pa-none justify-between">
                <q-btn outline rounded color="secondary" class="text-bold" :label="auth.nickname"
                    @click="profileDialog.open()" />
                <q-btn round flat dense icon="mail" class="q-ml-xs" />
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
                <GroupItem v-for="group in filteredGroups" :key="group.id" clickable :group-data="group"
                    @select="selectChannel(group.id)" />
            </q-list>
        </q-drawer>

        <q-footer class="q-pa-none">
            <MessageInput :channel-type="activeChannel?.type ?? ChannelType.PUBLIC" @send="handleSend" />
        </q-footer>

        <FormDialog v-model="createDialog.isOpen.value" title="Create Channel" confirm-color="secondary"
            description="Create a new channel to start chatting with others" confirm-label="Create"
            :loading="createDialog.loading.value" :disable-confirm="!createForm.name.trim()" @confirm="submitCreate"
            @cancel="closeCreate" @close="closeCreate">
            <template #content>
                <q-form class="column q-gutter-md">
                    <q-input v-model="createForm.name" label="Channel Name" color="secondary" dense outlined required
                        :rules="[val => !!val?.trim() || 'Name is required']">
                        <template v-slot:prepend>
                            <q-icon name="tag" />
                        </template>
                    </q-input>

                    <q-input v-model="createForm.description" label="Description (optional)" type="textarea"
                        color="secondary" autogrow dense outlined rows="2" max-rows="4">
                        <template v-slot:prepend>
                            <q-icon name="description" />
                        </template>
                    </q-input>

                    <q-select v-model="createForm.type" :options="channelTypeOptions" label="Channel Type"
                        color="secondary" dense outlined emit-value map-options>
                        <template v-slot:prepend>
                            <q-icon name="visibility" />
                        </template>
                    </q-select>
                </q-form>
            </template>
        </FormDialog>

        <FormDialog v-model="profileDialog.isOpen.value" title="User Profile" confirm-color="secondary"
            confirm-label="Apply" :loading="profileDialog.loading.value" :disable-confirm="checkChange()"
            @confirm="submitProfile" @cancel="closeProfile" @close="closeProfile">
            <template #content>
                <div class="column q-gutter-md">
                    <!-- Profile Header with nickname and status -->
                    <div class="column q-gutter-sm q-pb-md">
                        <div class="text-h4 text-weight-bold">{{ profileForm.nickname }}</div>

                        <div class="row items-center justify-between">
                            <!-- Status indicator -->
                            <div class="row items-center q-gutter-xs">
                                <q-icon name="circle" :color="getStatusColor(curentStatus)" size="12px" />
                                <span class="text-caption text-grey-7">{{ curentStatus }}</span>
                            </div>

                            <!-- Dates -->
                            <div class="column items-end">
                                <span class="text-caption text-grey-6">Created: {{ profileForm.createdAt }}</span>
                                <span class="text-caption text-grey-6">Updated: {{ profileForm.updatedAt }}</span>
                            </div>
                        </div>
                    </div>

                    <q-separator />

                    <!-- Profile Form -->
                    <q-form class="column q-gutter-md q-pt-sm">
                        <q-input v-model="profileForm.firstName" label="First Name" dense outlined color="secondary">
                            <template v-slot:prepend>
                                <q-icon name="person" color="secondary" />
                            </template>
                        </q-input>

                        <q-input v-model="profileForm.lastName" label="Last Name" dense outlined color="secondary">
                            <template v-slot:prepend>
                                <q-icon name="person" color="secondary" />
                            </template>
                        </q-input>

                        <q-input v-model="profileForm.email" label="Email" type="email" dense outlined
                            color="secondary">
                            <template v-slot:prepend>
                                <q-icon name="email" color="secondary" />
                            </template>
                        </q-input>

                        <q-select v-model="profileForm.status" :options="statusOptions" label="Status" dense outlined
                            color="secondary" emit-value map-options>
                            <template v-slot:prepend>
                                <q-icon name="circle" :color="getStatusColor(profileForm.status)" />
                            </template>
                            <template v-slot:option="scope">
                                <q-item v-bind="scope.itemProps">
                                    <q-item-section avatar>
                                        <q-icon name="circle" :color="getStatusColor(scope.opt.value)" size="12px" />
                                    </q-item-section>
                                    <q-item-section>
                                        <q-item-label>{{ scope.opt.label }}</q-item-label>
                                    </q-item-section>
                                </q-item>
                            </template>
                        </q-select>

                        <q-separator />
                        <div class="justify-between row">
                            <span class="content-center">Direct Notifications Only</span>
                            <q-toggle v-model="profileForm.directNotificationsOnly" color="secondary" />
                        </div>
                        <q-btn outline rounded dense color="negative" label="Logout" class="text-h6 text-bold"
                            @click="handleLogout" />
                    </q-form>
                </div>
            </template>
        </FormDialog>

        <!-- MAIN CONTENT -->
        <q-page-container>
            <router-view />
        </q-page-container>

    </q-layout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router';
import GroupItem from 'components/GroupItem.vue'
import FormDialog from 'src/components/FormDialog.vue'
import { useFormDialog } from 'src/composables/useFormDialog'
import type { CreateChannelPayload } from 'src/types/channels'
import { ChannelType } from 'src/types/channels'
import { useAuthStore } from 'src/stores/auth'
import { useChatStore } from 'src/stores/chat'
import type { UserPayload } from 'src/types/user'
import MessageInput from 'src/components/MessageInput.vue'
import { authService } from 'src/services/authService'

const router = useRouter();
const groupDrawer = ref(false);
const auth = useAuthStore();
const chat = useChatStore();
const search = ref<string>('')
const activeChannel = computed(() => chat.channels.find((c) => c.id === chat.activeChannelId) || null)

const filteredGroups = computed(() =>
    chat.channels
        .filter((c) => c.name.toLowerCase().includes(search.value.toLowerCase()))
        .map((c) => ({
            id: c.id,
            name: c.name,
            lastMessage: c.lastMessage?.content ?? '',
            lastTime: c.lastMessage?.sendAt
                ? new Date(c.lastMessage.sendAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '',
            unreadCount: c.newMessagesCount,
        }))
);

//#region Create channel dialog
const createDialog = useFormDialog();
const createForm = reactive<CreateChannelPayload>({ name: '', description: '', type: 0 });

const channelTypeOptions = [
    { label: 'Public', value: 0 },
    { label: 'Private', value: 1 }
];

onMounted(async () => {
    await chat.loadChannels();
    chat.connectSocket();
    if (!chat.activeChannelId) {
        const firstChannel = chat.channels.at(0);
        if (firstChannel) {
            chat.setActiveChannel(firstChannel.id);
        }
    }
    if (!chat.activeMessages.length) {
        chat.hydrateMockMessages();
    }
});

function selectChannel(channelId: string) {
    chat.setActiveChannel(channelId);
    router.push(`/chat/${channelId}`);
}

const handleSend = async (text: string) => {
    await chat.sendMessage(text);
};

function closeCreate() {
    createDialog.close();
    createForm.name = ''
    createForm.description = ''
    createForm.type = 0
}

async function submitCreate() {
    if (createForm.name.trim().length === 0) return

    createDialog.setLoading(true)
    try {
        const channel = await chat.createChannel(createForm)
        chat.setActiveChannel(channel.id)
        await router.push(`/chat/${channel.id}`)
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
const profileDialog = useFormDialog();
const statusMap: Record<number, string> = {
    1: 'Online',
    2: 'DND',
    3: 'Offline'
}

const curentStatus = String(statusMap[auth.settings?.status ?? 1] ?? 'Online')
const profileForm = reactive<UserPayload>({
    email: auth.user?.email ?? '',
    firstName: auth.user?.firstName ?? '',
    lastName: auth.user?.lastName ?? '',
    nickname: auth.user?.nickname ?? '',
    status: curentStatus,
    createdAt: auth.user?.createdAt ? new Date(auth.user.createdAt).toDateString() : "",
    updatedAt: auth.user?.updatedAt ? new Date(auth.user.updatedAt).toDateString() : "",
    directNotificationsOnly: auth.settings?.directNotificationsOnly ?? false
});

console.log(auth.user?.createdAt);

const statusOptions = [
    { label: 'Online', value: 'Online' },
    { label: 'DND', value: 'DND' },
    { label: 'Offline', value: 'Offline' }
]

function getStatusColor(status?: string): string {
    switch (status) {
        case 'Online':
            return 'green'
        case 'DND':
            return 'red'
        case 'Offline':
            return 'grey'
        default:
            return 'grey'
    }
}

function checkChange() {
    if (profileForm.email != (auth.user?.email ?? '') ||
        profileForm.firstName != (auth.user?.firstName ?? '') ||
        profileForm.lastName != (auth.user?.lastName ?? '') ||
        profileForm.status != curentStatus ||
        profileForm.directNotificationsOnly != (auth.settings?.directNotificationsOnly ?? false)) {
        return false;
    }
    return true;
}

function closeProfile() {
    profileDialog.close();
    profileForm.email = auth.user?.email ?? '';
    profileForm.firstName = auth.user?.firstName ?? '';
    profileForm.lastName = auth.user?.lastName ?? '';
    profileForm.nickname = auth.user?.nickname ?? '';
    profileForm.status = curentStatus;
    profileForm.createdAt = auth.user?.createdAt ? new Date(auth.user.createdAt).toDateString() : "";
    profileForm.updatedAt = auth.user?.updatedAt ? new Date(auth.user.updatedAt).toDateString() : "";
    profileForm.directNotificationsOnly = auth.settings?.directNotificationsOnly ?? false;
}

async function submitProfile() {
    if (profileForm.email != (auth.user?.email ?? '') ||
        profileForm.firstName != (auth.user?.firstName ?? '') ||
        profileForm.lastName != (auth.user?.lastName ?? '')) {
        console.log("Change Info");
    } else if (profileForm.status != curentStatus) {
        console.log("Change Status");
    } else if (profileForm.directNotificationsOnly != (auth.settings?.directNotificationsOnly ?? false)) {
        console.log("Change Notification");
    }
    closeProfile();
}
//#endregion

const handleLogout = async () => {
    await authService.logout();
    chat.disconnectSocket();
    await router.push('/login');
};
</script>
