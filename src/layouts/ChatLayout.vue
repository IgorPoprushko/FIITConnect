<template>
    <q-layout view="lHh Lpr lFf">

        <!-- HEADER -->
        <q-header>
            <q-toolbar>
                <q-toolbar-title>Drawer with Two Horizontal Scroll Areas</q-toolbar-title>
                <q-btn icon="menu" flat dense round @click="toggleChatDrawer" />
            </q-toolbar>
        </q-header>

        <!-- SINGLE LEFT DRAWER -->
        <q-drawer show-if-above side="left" :width="390" class="row no-wrap">
            <!-- LEFT SECTION (Mini Drawer) -->
            <div class="mini-drawer">
                <q-scroll-area class="fit" :horizontal-offset="[0, 2]">
                    <q-item clickable v-ripple>
                        <q-avatar size="48px">
                            <img :src="`https://picsum.photos/seed/left-0/64/64`" :alt="`Picture 0`" />
                        </q-avatar>
                        <q-tooltip anchor="center right" self="center left" :offset="[-10, 0]">
                            All Chats
                        </q-tooltip>
                    </q-item>

                    <q-separator spaced />

                    <q-item v-for="i in 20" :key="'left-' + i" clickable v-ripple>
                        <q-avatar size="48px">
                            <img :src="`https://picsum.photos/seed/left-${i}/64/64`" :alt="`Picture ${i}`" />
                        </q-avatar>
                        <q-tooltip anchor="center right" self="center left" :offset="[-10, 0]">
                            Picture{{ i }}
                        </q-tooltip>
                    </q-item>
                </q-scroll-area>
            </div>

            <q-separator vertical />

            <!-- RIGHT SECTION (Main Drawer) -->
            <div class="main-drawer">
                <!-- HEADER (fixed at top) -->
                <q-toolbar class="column q-pa-md">
                    <h6>Private Messages</h6>

                    <!-- Search input -->
                    <q-input rounded standout dense clearable placeholder="Search" v-model="search"
                        class="fit text-accent">
                        <template v-slot:prepend>
                            <q-icon name="search" color="accent" />
                        </template>
                    </q-input>
                </q-toolbar>

                <q-separator />

                <!-- CHAT LIST (scrollable) -->
                <q-scroll-area style="flex: 1 1 auto;">
                    <q-item v-for="n in 20" :key="n" clickable class="chat-item">
                        <!-- LEFT SIDE: avatar + text -->
                        <div class="row items-center no-wrap">
                            <q-avatar size="40px" class="q-mr-sm">
                                <q-icon name="person" />
                                <q-badge class="online-badge bg-green" v-if="n % 3 != 1" />
                            </q-avatar>

                            <div class="column">
                                <div class="text-body">Random name</div>
                                <div class="text-caption ellipsis" style="max-width: 160px;">
                                    Message which was sended...
                                </div>
                            </div>
                        </div>

                        <!-- RIGHT SIDE: time + unread badge -->
                        <div class="column items-end justify-center">
                            <div class="text-caption">4:10</div>
                            <q-badge class="notification-badge" v-if="n > 6 && n < 10" color="blue"
                                :label="n % 3 + 3" />
                        </div>
                    </q-item>
                </q-scroll-area>
            </div>
        </q-drawer>

        <!-- MAIN CONTENT -->
        <q-page-container>
            <router-view />
        </q-page-container>

    </q-layout>
</template>

<script setup lang="ts">
import { useChatDrawer } from 'src/composables/useChatDrawer';
import { ref } from 'vue'
const { toggleChatDrawer } = useChatDrawer()

const search = ref<string>('')
</script>

<style lang="scss" src="../css/chat-layout.scss"></style>