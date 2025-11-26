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
      { path: 'register', component: () => import('pages/auth/RegisterPage.vue') }],

    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (auth.isLoggedIn) {
        next({ path: '/chat' });
      } else {
        next();
      }
    }
  },
  {
    path: '/chat',
    component: () => import('layouts/ChatLayout.vue'),
    children: [{ path: '', component: () => import('pages/chat/MainPage.vue') }],
  },
  {
    path: '/test',
    component: () => import('layouts/ChatLayout_new.vue'),
    children: [
      { path: '', component: () => import('pages/chat/MainPage_new.vue') },
      {
        path: ':channelId',
        component: () => import('pages/chat/MainPage_new.vue'),
        name: 'chat-channel'
      }
    ],

    beforeEnter: (to, from, next) => {
      const auth = useAuthStore();
      if (auth.isLoggedIn) {
        next();
      } else {
        next({ path: '/login' });
      }
    }
  },


  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('src/pages/system/ErrorNotFound.vue'),
  },
];

export default routes;
