<template>
    <q-page class="flex flex-center fit q-my-md" style="min-height:100vh; max-width: 500px;">
        <q-card class="q-pa-xl column items-stretch justify-between "
            style="max-width: 600px; width: 90%; border-radius: 15px;">

            <!-- Header -->
            <div class="column items-center q-mb-md">
                <q-icon :name="logo" size="80px" class="q-mb-md rounded-borders overflow-hidden" />
                <div class="text-h5 text-weight-bold text-center">Create your account</div>
                <div class="text-caption text-center">Join us and get started in seconds</div>
            </div>
            <q-separator inset class="q-mb-lg" color="primary" />

            <!--Form: inputs and buttons-->
            <q-form @submit.prevent="onSubmit" class="column q-gutter-md">
                <q-input v-model="name" color="accent" filled label="First name" dense :rules="rules.required" />
                <q-input v-model="surname" color="accent" filled label="Last name" dense :rules="rules.required" />
                <q-input v-model="username" color="accent" filled label="Username" dense :rules="rules.required">
                    <template v-slot:prepend><q-icon name="person" /></template>
                </q-input>
                <q-input v-model="email" color="accent" filled label="Email address" type="email" dense
                    :rules="rules.email">
                    <template v-slot:prepend><q-icon name="mail" /></template>
                </q-input>
                <q-input v-model="password" color="accent" filled label="Password"
                    :type="passVisible ? 'password' : 'text'" dense :rules="rules.passwordCorrect">
                    <template v-slot:prepend><q-icon name="lock" /></template>
                    <template v-slot:append>
                        <q-icon :name="passVisible ? 'visibility_off' : 'visibility'" class="cursor-pointer"
                            @click="passVisible = !passVisible" />
                    </template>
                </q-input>
                <q-input v-model="passwordConfrim" color="accent" filled label="Confirm Password"
                    :type="passVisible ? 'password' : 'text'" dense :rules="rules.passwordMatch">
                    <template v-slot:append>
                        <q-icon :name="passVisible ? 'visibility_off' : 'visibility'" class="cursor-pointer"
                            @click="passVisible = !passVisible" />
                    </template>
                </q-input>
                <div class="column q-gutter-sm q-mt-md">
                    <p v-if="error" class="text-negative">This User Already Registered!</p>
                    <q-btn label="Sign Up" color="accent" unelevated class="full-width text-weight-bold" type="submit"
                        :loading="loading" />
                    <q-btn label="Already have an account?" color="accent" flat class="full-width" @click="goToLogin" />
                </div>
            </q-form>
        </q-card>
    </q-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref } from 'vue';

import { useApi } from 'src/components/server/useApi';
const { register, loading, error } = useApi();

// States
const router = useRouter();
const passVisible = ref(true);

const username = ref('');
const name = ref('');
const surname = ref('');
const email = ref('');
const password = ref('');
const passwordConfrim = ref('');

const logo = 'img:src/assets/image/logo.svg'

// Validation rules
const rules = {
    required: [
        (val: string) => !!val || 'This field is required',
    ],
    email: [
        (val: string) => !!val || 'Email is required',
        (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Invalid email format'
    ],
    passwordCorrect: [
        (val: string) => !!val || 'Password is required',
        (val: string) => val.length >= 6 || 'At least 6 characters'
    ]
    ,
    passwordMatch: [
        (val: string) => val === password.value || 'Passwords do not match'
    ]
}

// Submit handler
const onSubmit = async () => {
    try {
        const user = await register(name.value, surname.value, username.value, email.value, password.value);
        if (user && !error.value) {
            await router.push('chat');
        }
    } catch (err) {
        console.error(err)
    }
};
// Navigation
const goToLogin = () => router.push('login');
</script>
