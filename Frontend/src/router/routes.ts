import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '',
    redirect: 'login'
  },
  {
    path: '',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      { path: 'login', component: () => import('pages/auth/LoginPage.vue') },
      { path: 'register', component: () => import('pages/auth/RegisterPage.vue') }],
  },
  {
    path: '/chat',
    component: () => import('layouts/ChatLayout.vue'),
    children: [{ path: '', component: () => import('pages/chat/MainPage.vue') }],
  },
  {
    path: '/test',
    component: () => import('layouts/ChatLayout_new.vue'),
    children: [{ path: '', component: () => import('pages/chat/MainPage_new.vue') }],
  },


  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('src/pages/system/ErrorNotFound.vue'),
  },
];

export default routes;
