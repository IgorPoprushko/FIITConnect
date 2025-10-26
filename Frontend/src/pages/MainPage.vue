<template>
    <div class="main-page-container">
        <!-- Content of chat -->
        <div class="message-container">
            <MessageList ref="messageListRef" :messages="messages" />
            <!-- <MessageBubble v-for="(message, index) in messages" :key="message.id" :message="message"
                :previous-message="index > 0 ? messages[index - 1] : undefined" /> -->
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
import { useChatDrawer } from 'src/composables/useChatDrawer'
import { type IMessage } from 'src/types/messages'
import MessageList from 'components/MessageList.vue'
import MessageInput from 'components/MessageInput.vue'

const { chatDrawer } = useChatDrawer()
const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)

const sendMessage = (text: string) => {
    console.log('Message sent:', text)
}

const messages = ref<IMessage[]>([
    { id: 1, sender: "Alice", avatar: "https://cdn.quasar.dev/img/avatar2.jpg", text: "Hey! How are you?", date: new Date(), own: false, read: true },
    { id: 2, sender: "You", avatar: "https://cdn.quasar.dev/img/avatar4.jpg", text: "Hi Alice! I'm good, thanks. You?", date: new Date(), own: true, read: true },
    { id: 3, sender: "Alice", avatar: "https://cdn.quasar.dev/img/avatar2.jpg", text: "Doing great! Working on a new project.", date: new Date(), own: false, read: true },
    { id: 4, sender: "You", avatar: "https://cdn.quasar.dev/img/avatar4.jpg", text: "Oh, that sounds exciting. What’s it about?", date: new Date('Sun Oct 27 2025'), own: true, read: true },
    { id: 5, sender: "Alice", avatar: "https://cdn.quasar.dev/img/avatar2.jpg", text: "It’s a 3D visualization of a forest scene!", date: new Date('Sun Oct 27 2025'), own: false, read: true },
    { id: 6, sender: "You", avatar: "https://cdn.quasar.dev/img/avatar4.jpg", text: "Nice! Are you using Blender or Unity?", date: new Date('Sun Oct 27 2025'), own: true, read: true },
    { id: 7, sender: "Alice", avatar: "https://cdn.quasar.dev/img/avatar2.jpg", text: "Unity, actually. I’m adding a river and dynamic lighting.", date: new Date('Sun Oct 27 2025'), own: false, read: true },
    { id: 8, sender: "You", avatar: "https://cdn.quasar.dev/img/avatar4.jpg", text: "Dynamic lighting makes a big difference!", date: new Date('Sun Oct 27 2025'), own: true, read: true },
    { id: 9, sender: "Alice", avatar: "https://cdn.quasar.dev/img/avatar2.jpg", text: "Exactly! The reflections look amazing.", date: new Date('Sun Oct 27 2025'), own: false, read: true },
    { id: 10, sender: "You", avatar: "https://cdn.quasar.dev/img/avatar4.jpg", text: "By the way, are you adding sounds too?", date: new Date('Sun Oct 28 2025'), own: true, read: true },
    { id: 11, sender: "Alice", avatar: "https://cdn.quasar.dev/img/avatar2.jpg", text: "Yes! Birds, river flow, and wind ambience.", date: new Date(), own: false, read: true },
    { id: 12, sender: "You", avatar: "https://cdn.quasar.dev/img/avatar4.jpg", text: "That’s going to feel super immersive.", date: new Date(), own: true, read: true },
    { id: 13, sender: "Alice", avatar: "https://cdn.quasar.dev/img/avatar2.jpg", text: "I hope so! I’ll send you a demo soon.", date: new Date(), own: false, read: true },
    { id: 14, sender: "You", avatar: "https://cdn.quasar.dev/img/avatar4.jpg", text: "Looking forward to it!", date: new Date(), own: true, read: true },
    { id: 15, sender: "Alice", avatar: "https://cdn.quasar.dev/img/avatar2.jpg", text: "By the way, do you still use TypeScript?", date: new Date(), own: false, read: true },
    { id: 16, sender: "You", avatar: "https://cdn.quasar.dev/img/avatar4.jpg", text: "Yes, all the time. It’s great for structured data.", date: new Date(), own: true, read: true },
    { id: 17, sender: "Alice", avatar: "https://cdn.quasar.dev/img/avatar2.jpg", text: "Same! I’m typing everything with interfaces now.", date: new Date(), own: false, read: true },
    { id: 18, sender: "You", avatar: "https://cdn.quasar.dev/img/avatar4.jpg", text: "That’s the way to go. Fewer runtime errors!", date: new Date(), own: true, read: true },
    { id: 19, sender: "Alice", avatar: "https://cdn.quasar.dev/img/avatar2.jpg", text: "Totally agree 😄", date: new Date(), own: false, read: true },
    { id: 20, sender: "You", avatar: "https://cdn.quasar.dev/img/avatar4.jpg", text: "Do you want to collaborate on a mini project?", date: new Date(), own: true, read: true },
    { id: 21, sender: "Alice", avatar: "https://cdn.quasar.dev/img/avatar2.jpg", text: "Sure! What do you have in mind?", date: new Date(), own: false, read: true },
    { id: 22, sender: "You", avatar: "https://cdn.quasar.dev/img/avatar4.jpg", text: "Something with WebGL and interactive UI.", date: new Date(), own: true, read: true },
    { id: 23, sender: "Alice", avatar: "https://cdn.quasar.dev/img/avatar2.jpg", text: "That sounds awesome. Maybe a solar system simulation?", date: new Date(), own: false, read: true },
    { id: 24, sender: "You", avatar: "https://cdn.quasar.dev/img/avatar4.jpg", text: "Exactly! With planets orbiting and a black hole at the center.", date: new Date(), own: true, read: true },
    { id: 25, sender: "Alice", avatar: "https://cdn.quasar.dev/img/avatar2.jpg", text: "Wow, I like that idea!", date: new Date(), own: false, read: true },
    { id: 26, sender: "You", avatar: "https://cdn.quasar.dev/img/avatar4.jpg", text: "We can add atmospheric effects too.", date: new Date(), own: true, read: true },
    { id: 27, sender: "Alice", avatar: "https://cdn.quasar.dev/img/avatar2.jpg", text: "Perfect. I’ll start sketching the scene.", date: new Date(), own: false, read: true },
    { id: 28, sender: "You", avatar: "https://cdn.quasar.dev/img/avatar4.jpg", text: "And I’ll handle the camera transitions.", date: new Date(), own: true, read: true },
    { id: 29, sender: "Alice", avatar: "https://cdn.quasar.dev/img/avatar2.jpg", text: "Deal! Let’s make it cinematic!", date: new Date(), own: false, read: true },
    { id: 30, sender: "You", avatar: "https://cdn.quasar.dev/img/avatar4.jpg", text: "Can’t wait to see the final result!", date: new Date(), own: true, read: true },
]);


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