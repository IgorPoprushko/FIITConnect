<template>
    <div class="q-pa-md">
        <h1>This is a blank page</h1>
        <q-btn @click="handleClick">You clicked me {{ count }} times.</q-btn>
    </div>

    <q-drawer side="right" show-if-above>
        Hello from drawer!
    </q-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
function handleClick() {
    count.value++
}
</script>
