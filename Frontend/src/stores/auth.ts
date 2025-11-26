import { defineStore } from 'pinia';
import type { UserInfo, Settings } from 'src/types/user'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: localStorage.getItem('token') || '',

        // full user object and settings saved for clarity
        user: JSON.parse(localStorage.getItem('user') || 'null') as UserInfo | null,
        settings: JSON.parse(localStorage.getItem('settings') || 'null') as Settings | null
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
        setUser(user: UserInfo | null) {
            this.user = user
            if (user) {
                localStorage.setItem('user', JSON.stringify(user))
            }
            else {
                localStorage.removeItem('user')
            }
        },

        setSettings(settings: Settings | null) {
            this.settings = settings
            if (settings) {
                localStorage.setItem('settings', JSON.stringify(settings))
            }
            else {
                localStorage.removeItem('settings')
            }
        },

        logout() {
            this.token = '';
            localStorage.removeItem('token');
            this.setUser(null)
            this.setSettings(null)
        }
    }
});
