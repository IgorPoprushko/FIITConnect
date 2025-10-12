<template>
    <q-layout view="lHh Lpr lFf">

        <!-- HEADER -->
        <q-header elevated>
            <q-toolbar>
                <q-toolbar-title>Drawer with Two Horizontal Scroll Areas</q-toolbar-title>
            </q-toolbar>
        </q-header>

        <!-- SINGLE LEFT DRAWER -->
        <q-drawer show-if-above side="left" :width="280" class="row no-wrap">
            <!-- LEFT SECTION (Mini Drawer) -->
            <!-- <div class="col-auto scroll q-pa-sm bg-grey-2 mini-drawer" style="width: 80px;"> -->
            <div class="mini-drawer">
                <q-scroll-area class="fit" :horizontal-offset="[0, 2]">
                    <q-item clickable v-ripple>
                        <q-avatar size="48px">
                            <img :src="`https://picsum.photos/seed/left-0/64/64`" :alt="`Picture 0`" />
                            <q-tooltip>All Chats</q-tooltip>
                        </q-avatar>
                    </q-item>
                    <q-separator spaced />

                    <q-list>
                        <q-item v-for="i in 20" :key="'left-' + i" clickable v-ripple>
                            <q-avatar size="48px">
                                <img :src="`https://picsum.photos/seed/left-${i}/64/64`" :alt="`Picture ${i}`" />
                                <q-tooltip>Picture {{ i }}</q-tooltip>
                            </q-avatar>
                        </q-item>
                    </q-list>
                </q-scroll-area>
            </div>

            <q-separator vertical />

            <!-- RIGHT SECTION (Main Drawer) -->
            <div class="col scroll q-pa-sm main-drawer">
                <q-scroll-area class="fit" :horizontal-offset="[0, 2]">
                    <q-item>
                        <q-item-section>
                            <q-item-label header>Overlay Area</q-item-label>
                        </q-item-section>
                    </q-item>

                    <q-item v-for="i in 30" :key="'right-' + i" clickable v-ripple>
                        <q-item-section>
                            Item {{ i }}
                        </q-item-section>
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
</script>

<style lang="scss" src="../css/chat-layout.scss"></style>
