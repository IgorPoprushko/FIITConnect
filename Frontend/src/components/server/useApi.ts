import { ref } from 'vue';

const API_URL = 'http://localhost:3333';

interface AuthResponse {
    token: string;
    user: {
        id: number;
        email: string;
    };
}

interface ApiError {
    message: string;
}

export function useApi() {
    const loading = ref(false);
    const error = ref<string | null>(null);

    const request = async <T>(endpoint: string, method: string = 'GET', body: any = null): Promise<T> => {
        loading.value = true;
        error.value = null;

        try {
            const res = await fetch(`${API_URL}/${endpoint}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: body ? JSON.stringify(body) : null,
            });

            if (!res.ok) {
                const errData: ApiError = await res.json().catch(() => ({ message: res.statusText }));
                throw new Error(errData.message || 'Server Error');
            }
            return await res.json() as T;
        } catch (err: any) {
            error.value = err.message;
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const register = (first_name: string, last_name: string, nickname: string, email: string, password: string) => request<AuthResponse>('register', 'POST', { first_name, last_name, nickname, email, password });
    const login = (email: string, password: string) => request<AuthResponse>('login', 'POST', { email, password });
    const logout = () => request<void>('logout', 'POST');

    return {
        login,
        register,
        logout,
        loading,
        error,
    };
}
