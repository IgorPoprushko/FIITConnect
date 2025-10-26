<template>
    <div class="main-page-container">
        <!-- Content of chat -->
        <div class="message-container">
            <MessageList ref="messageListRef" />
        </div>

        <!-- Fixed input at bottom -->
        <div class="chat-input-footer">
            <MessageInput @send="sendMessage" />
        </div>

        <!-- Profile drawer -->
        <q-drawer class="q-pa-md bg-primary" v-model="chatDrawer" side="right" :width="300" bordered>
            <div class="text-center q-mb-md">
                <q-avatar size="80px">
                    <img src="https://cdn.quasar.dev/img/avatar2.jpg" alt="User" />
                </q-avatar>
                <div class="text-h6 q-mt-sm">Alice</div>
                <div class="text-caption">Online</div>
            </div>

            <q-separator spaced />

            <q-list>
                <q-item clickable v-ripple>
                    <q-item-section avatar>
                        <q-icon name="info" />
                    </q-item-section>
                    <q-item-section>About</q-item-section>
                </q-item>
            </q-list>
        </q-drawer>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MessageList from 'components/MessageList.vue'
import MessageInput from 'components/MessageInput.vue'
import { useChatDrawer } from 'src/composables/useChatDrawer'

const { chatDrawer } = useChatDrawer()
const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)

const sendMessage = (text: string) => {
    console.log('Message sent:', text)

    // Scroll to bottom after sending a message
    setTimeout(() => {
        messageListRef.value?.scrollToBottom()
    }, 100)
}
</script>

<style scoped>
.main-page-container {
    height: 93vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.message-container {
    flex: 1;
    overflow: hidden;
    min-height: 0;
    /* Important for proper flex behavior */
}

.chat-input-footer {
    flex-shrink: 0;
    z-index: 10;
    width: 100%;
    border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>