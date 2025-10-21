import { ref } from "vue"

const chatDrawer = ref(false)

export function useChatDrawer() {
    function toggleChatDrawer() {
        chatDrawer.value = !chatDrawer.value
    }
    return {
        chatDrawer,
        toggleChatDrawer
    }
}