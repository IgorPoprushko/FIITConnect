<template>
    <q-page class="flex flex-center fit">
        <q-card class="q-pa-xl column items-stretch justify-between">

            <!-- Header -->
            <div class="column items-center q-mb-md">
                <q-icon :name="logo" size="80px" class="rounded-borders overflow-hidden q-mb-md text-secondary" />
                <div class="text-h5 text-weight-bold text-center">Welcome back!</div>
                <div class="text-caption text-center">Log in to your account</div>
            </div>
            <q-separator inset class="q-mb-lg" color="primary" />

            <!--Form: inputs and buttons-->
            <q-form @submit.prevent="onSubmit" class="column q-gutter-md">
                <q-input v-model="email" color="accent" filled label="Email address" type="email" dense
                    :rules="[rules.required, rules.email]">
                    <template v-slot:prepend><q-icon name="mail" /></template>
                </q-input>
                <q-input v-model="password" color="accent" filled label="Password"
                    :type="passVisible ? 'password' : 'text'" dense :rules="[rules.required, rules.minLength(6)]">
                    <template v-slot:prepend><q-icon name="lock" /></template>
                    <template v-slot:append>
                        <q-icon :name="passVisible ? 'visibility_off' : 'visibility'" class="cursor-pointer"
                            @click="passVisible = !passVisible" />
                    </template>
                </q-input>
                <div class="column q-gutter-sm q-mt-md">
                    <p v-if="errorMessage" class="text-negative">{{ errorMessage }}</p>
                    <q-btn label="Log In" color="accent" unelevated class="q-mt-md full-width text-weight-bold"
                        type="submit" :loading="loading" />
                    <q-btn label="Sign Up" color="accent" flat class="full-width" @click="goToRegister" />
                </div>
            </q-form>
        </q-card>
    </q-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import { rules } from 'src/components/rules/rules';
import { authService } from 'src/services/authService';
// States
const router = useRouter();
const passVisible = ref(true);

const email = ref('');
const password = ref('');

const logo = 'img:src/assets/image/logo.svg'

// Submit handler
const loading = ref(false)
const errorMessage = ref('')
const onSubmit = async () => {
    errorMessage.value = ''
    try {
        await authService.login(email.value, password.value);
        await router.push('chat');
    } catch (err) {
        errorMessage.value = 'Wrong email or password';
        console.error('Login failed', err)
    }
};

// Navigation
const goToRegister = async () => {
    await router.push('/register');
};
</script>
