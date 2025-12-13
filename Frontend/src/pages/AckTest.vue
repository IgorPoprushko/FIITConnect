// frontend/src/pages/AckTest.vue (Тест ACK для getMyProfile)

<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">WS ACK Тест: getMyProfile</div>
    <p class="text-caption">
      Цей тест перевіряє, чи працює загальний механізм ACK Socket.IO для іншого, складного запиту.
      Якщо він проходить, проблема в даних запиту user:get:channels.
    </p>

    <q-btn
      label="1. Підключитися до WS"
      color="secondary"
      @click="setupSocketConnection"
      :disable="connected"
      class="q-mr-sm"
    />
    <q-btn
      label="2. Викликати getMyProfile (З ACK)"
      color="primary"
      @click="startTest"
      :loading="loading"
      :disable="!connected || loading"
    />
    <q-separator spaced class="q-my-md" />

    <q-list bordered separator>
      <q-item>
        <q-item-section avatar>
          <q-icon name="wifi" :color="connected ? 'green' : 'red'" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Статус WS</q-item-label>
          <q-item-label caption>{{ statusMessage }}</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>

    <div v-if="profileData" class="q-mt-md">
      <div class="text-subtitle1">🟢 **Успіх! Отримані дані профілю (UserFullDto):**</div>
      <pre class="q-pa-sm bg-grey-2 rounded-borders text-caption">{{ profileData }}</pre>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { socketService } from 'src/services/socketService';
// Потрібно, щоб цей контракт був доступний
import type { UserFullDto } from 'src/contracts/user_contracts';
import { useAuthStore } from 'src/stores/auth'; // Припускаємо використання Auth Store для токена

const auth = useAuthStore();

const loading = ref(false);
const connected = ref(false);
const statusMessage = ref('Очікування підключення...');
const profileData = ref<UserFullDto | null>(null);

function setupSocketConnection() {
  if (connected.value) return;

  // Використовуйте ваш auth store для отримання токена
  const token = auth.token;

  if (!token) {
    statusMessage.value = 'Помилка: Токен не знайдено в Auth Store.';
    console.error('[TEST] Токен відсутній. Перевірте Pinia/Auth Store.');
    return;
  }

  statusMessage.value = 'Підключення...';

  // ❗ ВИКОРИСТОВУЄМО ВАШ socketService.connect
  const socket = socketService.connect(token);

  socket.on('connect', () => {
    connected.value = true;
    statusMessage.value = '✅ Підключено. Готовність до тесту.';
  });

  socket.on('disconnect', () => {
    connected.value = false;
    statusMessage.value = '🛑 Відключено.';
  });
}

async function startTest() {
  if (!connected.value) return;

  loading.value = true;
  profileData.value = null;
  statusMessage.value = '🚀 Надсилання запиту user:get:full_info... (Очікування ACK)';

  try {
    const start = Date.now();

    // ❗ ВИКЛИКАЄМО МЕТОД, ЯКИЙ ВИКОРИСТОВУЄ ACK (getMyProfile)
    const result = await socketService.getMyProfile();
    const duration = Date.now() - start;

    profileData.value = result;
    statusMessage.value = `🟢 Успіх! ACK отримано за ${duration} мс.`;
    console.log(`[TEST] getMyProfile SUCCESS. Duration: ${duration}ms`, result);
  } catch (error) {
    let errorMessage = 'Unknown error'; // Початкове повідомлення

    // ❗ ВИПРАВЛЕННЯ TS: Звуження типу ❗
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      errorMessage = error.message;
    }
    // ------------------------------------

    statusMessage.value = `❌ Помилка ACK: ${errorMessage}`;
    console.error('[TEST] getMyProfile FAILED:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  // Автоматичне підключення при завантаженні компонента
  setupSocketConnection();
});
</script>
