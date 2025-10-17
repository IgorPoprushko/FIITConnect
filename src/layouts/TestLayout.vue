<template>
    <div class="chat-drawer">

        <!-- HEADER (fixed at top) -->
        <q-toolbar class="column q-pa-md" style="flex: 0 0 auto;">
            <div class="text-h6 text-white q-mb-md">Private messages</div>

            <!-- Search input -->
            <q-input rounded standout="bg-primary" dense clearable placeholder="Search" class="q-mb-md fit"
                input-class="text-white" v-model="search">
                <template v-slot:prepend>
                    <q-icon name="search" color="grey-5" />
                </template>
            </q-input>
        </q-toolbar>

        <q-separator color="grey-9" />

        <!-- CHAT LIST (scrollable) -->
        <q-scroll-area style="flex: 1 1 auto;">
            <q-item v-for="n in 20" :key="n" clickable class="chat-item">
                <!-- LEFT SIDE: avatar + text -->
                <div class="row items-center no-wrap">
                    <q-avatar size="40px" class="q-mr-sm">
                        <q-icon name="person" color="grey-6" />
                        <q-badge v-if="n < 3" color="green" rounded floating
                            style="top: auto; bottom: 2px; right: 2px" />
                    </q-avatar>

                    <div class="column">
                        <div class="text-white text-body1">Random name</div>
                        <div class="text-grey text-caption ellipsis" style="max-width: 160px;">
                            Message which was sended...
                        </div>
                    </div>
                </div>

                <!-- RIGHT SIDE: time + unread badge -->
                <div class="column items-end justify-center">
                    <div class="text-grey text-caption">4:10</div>
                    <q-badge v-if="n === 3" color="blue" label="3" rounded />
                </div>
            </q-item>
        </q-scroll-area>

    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const search = ref('')
</script>

<style lang="scss" src="../css/chat-layout.scss"></style>