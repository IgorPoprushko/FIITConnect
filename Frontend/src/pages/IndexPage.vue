<template>
  <q-page class="row items-center justify-evenly">
    <q-btn to="/chat" label="Go to Chat" color="primary" class="q-mt-lg" />
    <q-btn to="/auth/" label="Go to Login" color="secondary" class="q-mt-lg" />
    <q-btn @click="sendMessage" label="Send Message" color="positive" class="q-mt-lg" />
  </q-page>
</template>

<script setup lang="ts">
import { getCurrentInstance } from 'vue';

const { appContext } = getCurrentInstance()!;
const socket = appContext.config.globalProperties.$socket;

const sendMessage = () => {
  socket.emit('frontend', { text: 'Hello from frontend Quasar!' });
};
</script>
