import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/auth',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      { path: '/login', component: () => import('pages/LoginPage.vue') },
      { path: '/register', component: () => import('pages/RegisterPage.vue') }],
  },
  {
    path: '/chat',
    component: () => import('layouts/ChatLayout.vue'),
    children: [{ path: '', component: () => import('pages/MainPage.vue') }],
  },
  {
    path: '/test',
    children: [{ path: '', component: () => import('layouts/TestLayout.vue') }],
  },


  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
