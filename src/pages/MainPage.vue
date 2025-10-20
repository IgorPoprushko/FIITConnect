<template>
    <!-- Content of chat -->
    <div class="q-pa-md scroll message-container">
        <MessageList />
    </div>

    <MessageInput @send="sendMessage" class="chat-input-footer" />

    <!--Profile drawer-->
    <q-drawer class="q-pa-md" v-model="chatDrawer" side="right" :width="300" bordered>
        <div class="text-center q-mb-md">
            <q-avatar size="80px">
                <img src="https://cdn.quasar.dev/img/avatar2.jpg" alt="User" />
            </q-avatar>
            <div class="text-h6 q-mt-sm">Alice</div>
            <div class="text-caption text-grey-5">Online</div>
        </div>

        <q-separator spaced />

        <q-list>
            <q-item clickable v-ripple>
                <q-item-section avatar><q-icon name="info" /></q-item-section>
                <q-item-section>About</q-item-section>
            </q-item>
        </q-list>
    </q-drawer>
</template>

<script setup lang="ts">
import MessageList from 'components/MessageList.vue'
import MessageInput from 'components/MessageInput.vue'
import { useChatDrawer } from 'src/composables/useChatDrawer'

const { chatDrawer } = useChatDrawer()

const sendMessage = (text: string) => {
    console.log('Message sent:', text)
}

</script>

<style scoped>
.message-container {
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
}


.chat-input-footer {
    position: sticky;
    bottom: 0;
    z-index: 10;
    width: 100%;
}
</style>
