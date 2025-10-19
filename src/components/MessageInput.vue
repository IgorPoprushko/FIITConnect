<template>
    <div class="row items-center q-pa-sm text-white bg-grey-9">
        <q-btn class="q-mr-sm" round color="primary" icon="attach_file" @click="handleAttach" />
        <q-btn class="q-mr-sm" round color="primary" icon="emoji_emotions" @click="onEmojiClick" />
        <q-input v-model="messageText" placeholder="Type your message here..." class="chat-input col q-mr-sm q-ml-md"
            dense borderless type="textarea" autogrow rows="1" max-rows="6" maxlength="1024" />
        <q-btn round color="primary" icon="send" @click="handleSend" :disable="!messageText.trim()" />
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const messageText = ref('');

const emit = defineEmits<{
    (e: 'send', text: string): void
}>()

const handleSend = () => {
    const text = messageText.value.trim();
    if (!text) return;

    emit('send', text);
    messageText.value = ''
};

const handleAttach = () => {
    // Placeholder for file attachment functionality
    console.log('Attach button clicked');
};

const onEmojiClick = () => {
    // Placeholder for emoji picker functionality
    console.log('Emoji picker clicked');
};
</script>

<style scoped>
.chat-input {
    max-height: 150px;
    overflow: auto;
}
</style>
