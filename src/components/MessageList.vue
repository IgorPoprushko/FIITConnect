<template>
    <div class="q-pa-md column message-container">
        <q-chat-message v-for="message in messages" :key="message.id" :name="message.name" :avatar="message.avatar"
            :text="[message.text]" :stamp="message.time" :sent="message.isMine"
            :bg-color="message.isMine ? 'primary' : 'secondary'" text-color="white" class="q-mb-sm message-item" />
    </div>
</template>

<script setup lang="ts">
const messages = [
    {
        id: 1,
        name: 'Alice',
        avatar: 'https://cdn.quasar.dev/img/avatar2.jpg',
        text: 'Hello!',
        time: '10:00',
        isMine: false,
    },
    {
        id: 2,
        name: 'You',
        avatar: 'https://cdn.quasar.dev/img/avatar4.jpg',
        text: 'Yo! How are you?',
        time: '10:01',
        isMine: true,
    },
    {
        id: 3,
        name: 'Alice',
        avatar: 'https://cdn.quasar.dev/img/avatar2.jpg',
        text: 'I am good, thanks! What about you?',
        time: '10:02',
        isMine: false,
    },
    {
        id: 4,
        name: 'You',
        avatar: 'https://cdn.quasar.dev/img/avatar4.jpg',
        text: 'Doing great, working on a new project.',
        time: '10:03',
        isMine: true,
    },
    {
        id: 5,
        name: 'Alice',
        avatar: 'https://cdn.quasar.dev/img/avatar2.jpg',
        text: 'That sounds awesome! Tell me more about it, please!',
        time: '10:04',
        isMine: false,
    },
    {
        id: 5,
        name: 'Alice',
        avatar: 'https://cdn.quasar.dev/img/avatar2.jpg',
        text: 'That sounds awesome! Tell me more about it, please! Tell me more about it, please! Tell me more about it, please! Tell me more about it, please! Tell me more about it, please! Tell me more about it, please! Tell me more about it, please!',
        time: '10:04',
        isMine: false,
    },
    {
        id: 6,
        name: 'You',
        avatar: 'https://cdn.quasar.dev/img/avatar4.jpg',
        text: 'Sure! It is a web application built with Vue.js and Quasar Framework.',
        time: '10:05',
        isMine: true,
    },
    {
        id: 7,
        name: 'Alice',
        avatar: 'https://cdn.quasar.dev/img/avatar2.jpg',
        text: 'Wow, that\'s cool! Good luck with your project!',
        time: '10:06',
        isMine: false,
    },
    {
        id: 8,
        name: 'You',
        avatar: 'https://cdn.quasar.dev/img/avatar4.jpg',
        text: 'Thank you!',
        time: '10:07',
        isMine: true,
    },
    {
        id: 9,
        name: 'Alice',
        avatar: 'https://cdn.quasar.dev/img/avatar2.jpg',
        text: 'Let me know if you need any help.',
        time: '10:08',
        isMine: false,
    },
    {
        id: 10,
        name: 'You',
        avatar: 'https://cdn.quasar.dev/img/avatar4.jpg',
        text: 'Will do! Thanks again!',
        time: '10:09',
        isMine: true,
    },
    {
        id: 11,
        name: 'Alice',
        avatar: 'https://cdn.quasar.dev/img/avatar2.jpg',
        text: 'No problem! Have a great day!',
        time: '10:10',
        isMine: false,
    },
    {
        id: 12,
        name: 'You',
        avatar: 'https://cdn.quasar.dev/img/avatar4.jpg',
        text: 'You too! Bye!',
        time: '10:11',
        isMine: true,
    }
]
</script>

<style scoped>
.message-container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
}

.message-item {
    max-width: 100%;
    word-wrap: break-word;
    white-space: pre-wrap;
}

@media (max-width: 600px) {
    .message-item {
        max-width: 95%;
    }
}
</style>
