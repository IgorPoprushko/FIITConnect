import { ref } from 'vue'

export function useFormDialog() {
    const isOpen = ref(false)
    const loading = ref(false)

    const open = () => {
        isOpen.value = true
    }

    const close = () => {
        isOpen.value = false
        loading.value = false
    }

    const setLoading = (state: boolean) => {
        loading.value = state
    }

    return {
        isOpen,
        loading,
        open,
        close,
        setLoading
    }
}