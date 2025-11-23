<template>
    <q-page class="flex flex-center fit" style="min-height:100vh; max-width: 500px;">
        <q-card class="q-pa-xl column items-stretch justify-between"
            style="max-width: 600px; width: 90%; border-radius: 15px;">

            <!-- Header -->
            <div class="column items-center q-mb-md">
                <q-icon :name="logo" size="80px" class="rounded-borders overflow-hidden q-mb-md text-secondary" />
                <div class="text-h5 text-weight-bold text-center">Welcome back!</div>
                <div class="text-caption text-center">Log in to your account</div>
            </div>
            <q-separator inset class="q-mb-lg" color="primary" />

            <!--Form: inputs and buttons-->
            <q-form @submit.prevent="onSubmit" class="colunm q-gutter-md">
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
                    <p v-if="error" class="text-negative">Wrong Email or Pasword</p>
                    <q-btn label="Log In" color="accent" unelevated class="q-mt-md full-width text-weight-bold"
                        type="submit" :loading="loading" />
                    <q-btn label="Sing Up" color="accent" flat class="full-width" @click="goToRegister" />
                </div>
            </q-form>
        </q-card>
    </q-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import { rules } from 'src/components/rules/rules';

import { useApi } from 'src/components/server/useApi';
const { login } = useApi();
// States
const router = useRouter();
const passVisible = ref(true);

const email = ref('');
const password = ref('');

const logo = 'img:src/assets/image/logo.svg'

// Submit handler   
const loading = ref(false)
const error = ref(false)
const onSubmit = async () => {
    error.value = false
    try {
        await login(email.value, password.value);
        await router.push('chat');
    } catch (err) {
        error.value = true
        console.error(err)
    }
};

// Navigation
const goToRegister = () => {
    void router.push('/register');
};
</script>
