import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: localStorage.getItem('token') || ''
    }),

    getters: {
        isLoggedIn: (state) => !!state.token
    },

    actions: {
        setToken(token: string) {
            this.token = token;
            localStorage.setItem('token', token);
        },

        logout() {
            this.token = '';
            localStorage.removeItem('token');
        }
    }
});
