<template>
    <div class="q-pa-xl bg-blue-2">
        <!-- Infinite scroll for old messages-->
        <q-infinite-scroll reverse @load="loadOlderMessages">
            <template v-slot:loading>
                <div class="row justify-center q-my-md">
                    <q-spinner-dots color="primary" name="dots" size="40px" />
                </div>
            </template>
            <q-chat-message text-color="white" v-for="(message, index) in messages" :key="message.id"
                :label="isNewDay(index) ? message.date : ''" :name="message.name" :avatar="message.avatar"
                :text="[message.text]" :stamp="message.time" :sent="message.isMine"
                :bg-color="message.isMine ? 'primary' : 'secondary'" class="q-mb-sm message-item" />
        </q-infinite-scroll>

    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'


const messages = ref([
    {
        id: 1,
        name: 'Alice',
        avatar: 'https://cdn.quasar.dev/img/avatar2.jpg',
        text: 'Hello!',
        time: '10:00',
        isMine: false,
        date: '2025-10-5',
    },
    {
        id: 2,
        name: 'You',
        avatar: 'https://cdn.quasar.dev/img/avatar4.jpg',
        text: 'Yo! How are you?',
        time: '10:01',
        isMine: true,
        date: '2025-10-5',
    },
    {
        id: 3,
        name: 'Alice',
        avatar: 'https://cdn.quasar.dev/img/avatar2.jpg',
        text: 'I am good, thanks! What about you?',
        time: '10:02',
        isMine: false,
        date: '2025-10-5',
    },
    {
        id: 4,
        name: 'You',
        avatar: 'https://cdn.quasar.dev/img/avatar4.jpg',
        text: 'Doing great, working on a new project.',
        time: '10:03',
        isMine: true,
        date: '2025-10-6',
    },
    {
        id: 5,
        name: 'Alice',
        avatar: 'https://cdn.quasar.dev/img/avatar2.jpg',
        text: 'That sounds awesome! Tell me more about it, please!',
        time: '10:04',
        isMine: false,
        date: '2025-10-7',
    },
    {
        id: 5,
        name: 'Alice',
        avatar: 'https://cdn.quasar.dev/img/avatar2.jpg',
        text: 'That sounds awesome! Tell me more about it, please! Tell me more about it, please! Tell me more about it, please! Tell me more about it, please! Tell me more about it, please! Tell me more about it, please! Tell me more about it, please!',
        time: '10:04',
        isMine: false,
        date: '2025-10-8',
    },
    {
        id: 6,
        name: 'You',
        avatar: 'https://cdn.quasar.dev/img/avatar4.jpg',
        text: 'Sure! It is a web application built with Vue.js and Quasar Framework.',
        time: '10:05',
        isMine: true,
        date: '2025-10-11',
    },
    {
        id: 7,
        name: 'Alice',
        avatar: 'https://cdn.quasar.dev/img/avatar2.jpg',
        text: 'Wow, that\'s cool! Good luck with your project!',
        time: '10:06',
        isMine: false,
        date: '2025-10-12',
    },
    {
        id: 8,
        name: 'You',
        avatar: 'https://cdn.quasar.dev/img/avatar4.jpg',
        text: 'Thank you!',
        time: '10:07',
        isMine: true,
        date: '2025-10-13',
    },
    {
        id: 9,
        name: 'Alice',
        avatar: 'https://cdn.quasar.dev/img/avatar2.jpg',
        text: 'Let me know if you need any help.',
        time: '10:08',
        isMine: false,
        date: '2025-10-13',
    },
    {
        id: 10,
        name: 'You',
        avatar: 'https://cdn.quasar.dev/img/avatar4.jpg',
        text: 'Will do! Thanks again!',
        time: '10:09',
        isMine: true,
        date: '2025-10-15',
    },
    {
        id: 11,
        name: 'Alice',
        avatar: 'https://cdn.quasar.dev/img/avatar2.jpg',
        text: 'No problem! Have a great day!',
        time: '10:10',
        isMine: false,
        date: '2025-10-15',
    },
    {
        id: 12,
        name: 'You',
        avatar: 'https://cdn.quasar.dev/img/avatar4.jpg',
        text: 'You too! Bye!',
        time: '10:11',
        isMine: true,
        date: '2025-10-15',
    }
])

function isNewDay(index: number): boolean {
    if (index === 0) return true

    const currentDate = messages.value[index]?.date
    const prevDate = messages.value[index - 1]?.date
    return currentDate !== prevDate
}

let page = 1;

type DoneFunction = (stop?: boolean) => void;

const loadOlderMessages = (index: number, done: DoneFunction) => {
    setTimeout(() => {
        if (page >= 5) {
            done(true); // No more data to load
            return;
        }
        const older = [
            {
                id: Date.now(),
                name: 'Alice',
                avatar: 'https://cdn.quasar.dev/img/avatar2.jpg',
                text: 'Earlier message ' + index,
                time: '09:59',
                isMine: false,
                date: '2025-09-02',
            },
            {
                id: Date.now() + 1,
                name: 'You',
                avatar: 'https://cdn.quasar.dev/img/avatar4.jpg',
                text: 'Another older one!',
                time: '09:58',
                isMine: true,
                date: '2025-09-02',
            },
        ]
        messages.value.unshift(...older)

        page++;

        done();

    }, 1500)


}
</script>

<style scoped></style>
