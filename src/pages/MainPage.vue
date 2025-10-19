<template>
    <q-page class="fit">
        <div ref="chat" class="">
            <MessageList />
        </div>
        <q-footer>
            <MessageInput @send="sendMessage" />
        </q-footer>
    </q-page>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import MessageList from 'components/MessageList.vue'
import MessageInput from 'components/MessageInput.vue'

const chat = ref<HTMLDivElement | null>(null)

const scrollToBottom = async () => {
    await nextTick()
    chat.value?.scrollTo(0, chat.value.scrollHeight)
}

const sendMessage = (text: string) => {
    console.log('Message sent:', text)
    void scrollToBottom()
}

onMounted(scrollToBottom)
</script>

<style scoped></style>
