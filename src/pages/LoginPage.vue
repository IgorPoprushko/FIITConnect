<template>
    <q-page class="flex flex-center fit" style="min-height:100vh; max-width: 500px;">
        <q-card class="q-pa-xl column items-stretch justify-between"
            style="max-width: 600px; width: 90%; border-radius: 15px;">

            <!-- Header -->
            <div class="column items-center q-mb-md">
                <q-icon :name="logo" size="80px" class="q-mb-md text-secondary" />
                <div class="text-h5 text-weight-bold text-center">Welcome back !</div>
                <div class="text-caption text-grey-7 text-center">Log in to your account</div>
            </div>
            <q-separator inset class="q-mb-lg" color="primary" />

            <!--Form: inputs and buttons-->
            <q-form @submit.prevent="onSubmit" class="colunm q-gutter-md">
                <q-input v-model="email" color="secondary" filled label="Email address" type="email" dense
                    :rules="rules.email">
                    <template v-slot:prepend><q-icon name="mail" /></template>
                </q-input>
                <q-input v-model="password" color="secondary" filled label="Password"
                    :type="isPwd ? 'password' : 'text'" dense :rules="rules.passwordCorrect">
                    <template v-slot:prepend><q-icon name="lock" /></template>
                    <template v-slot:append>
                        <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer"
                            @click="isPwd = !isPwd" />
                    </template>
                </q-input>
                <div class="text-right text-caption text-white q-mt-sm cursor-pointer hover-underline">
                    Forgot password?
                </div>
                <div class="column q-gutter-sm q-mt-md">
                    <q-btn label="Log In" color="secondary" unelevated class="q-mt-md full-width text-weight-bold"
                        type="submit" />
                    <q-btn label="Sing Up" color="secondary" flat class="full-width" @click="goToRegister" />
                </div>
            </q-form>
        </q-card>
    </q-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { computed, ref } from 'vue';

// States
const router = useRouter();
const isPwd = ref(true);

const email = ref('');
const password = ref('');

// Test Logo
const colorFace = ref('#368EB3')
const colorHair = ref('#36A7B3')
const logo = computed(() => {
    const face = colorFace.value.replace('#', '%23')
    const hair = colorHair.value.replace('#', '%23')
    return `img:data:image/svg+xml;charset=utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke="none" fill="${face}"><path fill="none" d="M0 0h24v24H0V0z"/><path stroke="${hair}" fill="${hair}" stroke-linecap="round" opacity=".5" d="M17.5 8c.46 0 .91-.05 1.34-.12C17.44 5.56 14.9 4 12 4c-.46 0-.91.05-1.34.12C12.06 6.44 14.6 8 17.5 8zM8.08 5.03C6.37 6 5.05 7.58 4.42 9.47c1.71-.97 3.03-2.55 3.66-4.44z"/><path stroke="none" fill="${face}" stroke-linecap="round"  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c2.9 0 5.44 1.56 6.84 3.88-.43.07-.88.12-1.34.12-2.9 0-5.44-1.56-6.84-3.88.43-.07.88-.12 1.34-.12zM8.08 5.03C7.45 6.92 6.13 8.5 4.42 9.47 5.05 7.58 6.37 6 8.08 5.03zM12 20c-4.41 0-8-3.59-8-8 0-.05.01-.1.01-.15 2.6-.98 4.68-2.99 5.74-5.55 1.83 2.26 4.62 3.7 7.75 3.7.75 0 1.47-.09 2.17-.24.21.71.33 1.46.33 2.24 0 4.41-3.59 8-8 8z"/><circle cx="9" cy="13" r="1.25"/><circle cx="15" cy="13" r="1.25"/></svg>`
})

// Validation rules
const rules = {
    email: [
        (val: string) => !!val || 'Email is required',
        (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Invalid email format'
    ],
    passwordCorrect: [
        (val: string) => !!val || 'Password is required',
        (val: string) => val.length >= 6 || 'At least 6 characters'
    ]
}

// Submit handler
const onSubmit = () => {
    console.log('Form submitted with:', { email: email.value, password: password.value });
};

// Navigation
const goToRegister = () => {
    void router.push('/register');
};
</script>

<style scoped>
.q-card {
    transition: all 0.8s ease;
}

.q-card:hover {
    transform: translateY(-10px);
    box-shadow: 7px 7px 15px rgba(0, 21, 255, 0.12);
}
</style>