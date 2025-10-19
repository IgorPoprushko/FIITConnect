<template>
    <div class="column fit">
        <!-- Content of chat -->
        <div ref="chat" class="col q-pa-md bg-grey-10">
            <q-scroll-area style="height: calc(100vh - 140px);">
                <MessageList />
            </q-scroll-area>
        </div>

        <!--Profile drawer-->
        <q-drawer v-model="chatDrawer" side="right" :width="300" bordered>

            <q-scroll-area class="fit q-pa-md">
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
            </q-scroll-area>
        </q-drawer>


        <MessageInput @send="sendMessage" />

    </div>

</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import MessageList from 'components/MessageList.vue'
import MessageInput from 'components/MessageInput.vue'
import { useChatDrawer } from 'src/composables/useChatDrawer'

const { chatDrawer } = useChatDrawer()
const chat = ref<HTMLDivElement | null>(null)


const scrollToBottom = async () => {
    await nextTick()
    chat.value?.scrollTo(0, chat.value.scrollHeight)
}

const sendMessage = (text: string) => {
    console.log('Message sent:', text)
    void scrollToBottom()
}

onMounted(() => {
    // 1. Заборонити прокручування всього документа при завантаженні компонента
    document.body.style.overflow = 'hidden'
    void scrollToBottom()
})

onUnmounted(() => {
    // 2. Ввімкнути прокручування назад, коли компонент знищено (ОБОВ'ЯЗКОВО!)
    document.body.style.overflow = ''
})
</script>

<style scoped></style>
