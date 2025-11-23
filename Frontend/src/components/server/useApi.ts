import { api } from 'boot/axios';
import { useAuthStore } from 'src/stores/auth';

export function useApi() {
    const auth = useAuthStore();

    async function login(email: string, password: string) {
        const res = await api.post('/login', { email, password });
        auth.setToken(res.data.token);
        return res.data;
    }

    async function register(first_name: string, last_name: string, nickname: string, email: string, password: string) {
        const res = await api.post('/register', { first_name, last_name, nickname, email, password });
        auth.setToken(res.data.token);
        return res.data;

    }

    function logout() {
        auth.logout();
    }

    // auto-inject token into every request
    api.interceptors.request.use((config) => {
        if (auth.token) {
            config.headers.Authorization = `Bearer ${auth.token}`;
        }
        return config;
    });

    return {
        login,
        register,
        logout
    };
}
