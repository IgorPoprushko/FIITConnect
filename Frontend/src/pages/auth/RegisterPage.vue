<template>
  <q-page class="flex flex-center fit q-my-md">
    <q-card class="q-pa-xl column items-stretch justify-between">
      <div class="column items-center q-mb-md">
        <q-icon :name="logo" size="80px" class="q-mb-md rounded-borders overflow-hidden" />
        <div class="text-h5 text-weight-bold text-center">Create your account</div>
        <div class="text-caption text-center">Join us and get started in seconds</div>
      </div>
      <q-separator inset class="q-mb-lg" color="primary" />

      <q-form @submit.prevent="onSubmit" class="column q-gutter-md">
        <q-input
          v-model="name"
          color="accent"
          filled
          label="First name"
          dense
          :rules="[rules.required]"
        />
        <q-input
          v-model="surname"
          color="accent"
          filled
          label="Last name"
          dense
          :rules="[rules.required]"
        />
        <q-input
          v-model="nickname"
          color="accent"
          filled
          label="Nickname"
          dense
          :rules="[rules.required]"
        >
          <template v-slot:prepend><q-icon name="person" /></template>
        </q-input>
        <q-input
          v-model="email"
          color="accent"
          filled
          label="Email address"
          type="email"
          dense
          :rules="[rules.required, rules.email]"
        >
          <template v-slot:prepend><q-icon name="mail" /></template>
        </q-input>
        <q-input
          v-model="password"
          color="accent"
          filled
          label="Password"
          :type="passVisible ? 'password' : 'text'"
          dense
          :rules="[rules.required, rules.minLength(6)]"
        >
          <template v-slot:prepend><q-icon name="lock" /></template>
          <template v-slot:append>
            <q-icon
              :name="passVisible ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="passVisible = !passVisible"
            />
          </template>
        </q-input>
        <q-input
          v-model="passwordConfrim"
          color="accent"
          filled
          label="Confirm Password"
          :type="passVisible ? 'password' : 'text'"
          dense
          :rules="[rules.required, rules.sameAs(() => password, 'Passwords do not match')]"
        >
          <template v-slot:append>
            <q-icon
              :name="passVisible ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="passVisible = !passVisible"
            />
          </template>
        </q-input>
        <div class="column q-gutter-sm q-mt-md">
          <p v-if="errorMessage" class="text-negative">{{ errorMessage }}</p>
          <q-btn
            label="Sign Up"
            color="accent"
            unelevated
            class="full-width text-weight-bold"
            type="submit"
            :loading="loading"
          />
          <q-btn
            label="Already have an account?"
            color="accent"
            flat
            class="full-width"
            @click="goToLogin"
          />
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

const nickname = ref('');
const name = ref('');
const surname = ref('');
const email = ref('');
const password = ref('');
const passwordConfrim = ref('');

const logo = 'img:src/assets/image/logo.svg';

// Submit handler
const loading = ref(false);
const errorMessage = ref('');
const onSubmit = async () => {
  try {
    await authService.register(
      name.value,
      surname.value,
      nickname.value,
      email.value,
      password.value,
    );
    await router.push('chat');
  } catch (err) {
    errorMessage.value = 'This user is already registered';
    console.error('Registration failed', err);
  }
};
// Navigation
const goToLogin = () => router.push('login');
</script>
