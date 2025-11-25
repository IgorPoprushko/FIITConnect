import { defineStore } from 'pinia';
import type { UserInfo } from 'src/types/user'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: localStorage.getItem('token') || '',

        // individual user fields for readability
        id: localStorage.getItem('user_id') || '',
        email: localStorage.getItem('user_email') || '',
        firstName: localStorage.getItem('user_firstName') || '',
        lastName: localStorage.getItem('user_lastName') || '',
        nickname: localStorage.getItem('user_nickname') || '',
        lastSeenAt: localStorage.getItem('user_lastSeenAt') || null,
        createdAt: localStorage.getItem('user_createdAt') || '',
        updatedAt: localStorage.getItem('user_updatedAt') || ''
    }),

    getters: {
        isLoggedIn: (state) => !!state.token,
        displayName: (state) => state.nickname || `${state.firstName || ''} ${state.lastName || ''}`.trim() || 'User'
    },

    actions: {
        setToken(token: string) {
            this.token = token;
            localStorage.setItem('token', token);
        },

        setUserFields(user: UserInfo) {
            this.id = user.id
            this.email = user.email
            this.firstName = user.firstName
            this.lastName = user.lastName
            this.nickname = user.nickname
            this.lastSeenAt = user.lastSeenAt ?? null
            this.createdAt = user.createdAt
            this.updatedAt = user.updatedAt

            localStorage.setItem('user_id', this.id)
            localStorage.setItem('user_email', this.email)
            localStorage.setItem('user_firstName', this.firstName)
            localStorage.setItem('user_lastName', this.lastName)
            localStorage.setItem('user_nickname', this.nickname)
            localStorage.setItem('user_lastSeenAt', String(this.lastSeenAt))
            localStorage.setItem('user_createdAt', this.createdAt)
            localStorage.setItem('user_updatedAt', this.updatedAt)
        },

        removetUserFields() {
            this.id = ''
            this.email = ''
            this.firstName = ''
            this.lastName = ''
            this.nickname = ''
            this.lastSeenAt = null
            this.createdAt = ''
            this.updatedAt = ''

            localStorage.setItem('user_id', this.id)
            localStorage.setItem('user_email', this.email)
            localStorage.setItem('user_firstName', this.firstName)
            localStorage.setItem('user_lastName', this.lastName)
            localStorage.setItem('user_nickname', this.nickname)
            localStorage.setItem('user_lastSeenAt', String(this.lastSeenAt))
            localStorage.setItem('user_createdAt', this.createdAt)
            localStorage.setItem('user_updatedAt', this.updatedAt)
        },

        logout() {
            this.token = '';
            localStorage.removeItem('token');
            this.removetUserFields()
        }
    }
});
