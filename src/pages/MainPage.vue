<template>
    <div class="q-pa-md">
        <h1>This is a blank page</h1>
        <q-btn @click="handleClick">You clicked me {{ count }} times.</q-btn>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
function handleClick() {
    count.value++
}
</script>
