<template>
    <!--  -->
    <q-chat-message text-color="white" :label="getNextDay(previousMessage)" :name="message.sender"
        :avatar="message.avatar" :text="[message.text]" :stamp="getTime(message.date)" :sent="message.own"
        :bg-color="message.own ? 'primary' : 'secondary'" class="q-mb-sm q-px-sm message-item" />
</template>

<script setup lang="ts">
import { type IMessage } from 'src/types/messages'

interface Props {
    message: IMessage
    previousMessage: IMessage | undefined
}
const props = defineProps<Props>()
const message = props.message;

function getNextDay(prevMessage: IMessage | undefined): string {
    const dateLable = message.date.toDateString()

    if (prevMessage == undefined || prevMessage.date.toDateString() == dateLable)
        return '';
    else
        return dateLable;
}

function getTime(date: Date) {
    return date.toTimeString().slice(0, 5)
}

</script>

<style>
.message-item {
    max-width: 1150px;
    margin: auto auto;
}
</style>