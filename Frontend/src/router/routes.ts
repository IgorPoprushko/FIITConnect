import { useAuthStore } from 'src/stores/auth';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '',
    redirect: '/login',
  },
  {
    path: '',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      { path: 'login', component: () => import('pages/auth/LoginPage.vue') },
      { path: 'register', component: () => import('pages/auth/RegisterPage.vue') },
    ],

    // Логіка перенаправлення: якщо залогінений, йдемо в чат
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (auth.isLoggedIn) {
        next({ path: '/chat' });
      } else {
        next();
      }
    },
  },
  {
    path: '/chat',
    component: () => import('layouts/ChatLayout.vue'),
    children: [
      { path: '', component: () => import('pages/chat/MainPage.vue') },
      {
        path: ':channelId',
        component: () => import('pages/chat/MainPage.vue'),
        name: 'chat-channel',
      },
    ],

    // Логіка захисту маршруту: якщо не залогінений, йдемо на логін
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (auth.isLoggedIn) {
        next();
      } else {
        next({ path: '/login' });
      }
    },
  },

  // ❗ ВИПРАВЛЕНО 1: Додано скісну риску '/' для усунення помилки Vue Router.
  // ❗ ВИПРАВЛЕНО 2: Обгорнуто у ChatLayout для усунення помилки QPage needs QLayout.
  // ❗ ВИПРАВЛЕНО 3: Додано перевірку автентифікації (beforeEnter).
  {
    path: '/ack',
    component: () => import('layouts/ChatLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/AckTest.vue'),
      },
    ],

    // Логіка захисту маршруту (тільки для залогінених)
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (auth.isLoggedIn) {
        next();
      } else {
        next({ path: '/login' });
      }
    },
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('src/pages/system/ErrorNotFound.vue'),
  },
];

export default routes;
