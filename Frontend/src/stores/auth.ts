import { defineStore } from 'pinia';
import type { UserFullDto, UserSettingsDto } from 'src/contracts/user_contracts';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',

    user: JSON.parse(localStorage.getItem('user') || 'null') as UserFullDto | null,

    settings: JSON.parse(localStorage.getItem('settings') || 'null') as UserSettingsDto | null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    nickname: (state) => state.user?.nickname ?? '',
  },

  actions: {
    setToken(token: string) {
      this.token = token;
      localStorage.setItem('token', token);
    },

    setUser(user: UserFullDto | null) {
      this.user = user;
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    },

    setSettings(settings: UserSettingsDto | null) {
      this.settings = settings;
      if (settings) {
        localStorage.setItem('settings', JSON.stringify(settings));
      } else {
        localStorage.removeItem('settings');
      }
    },

    logout() {
      this.token = '';
      localStorage.removeItem('token');
      this.setUser(null);
      this.setSettings(null);
    },
  },
});
