import { api } from 'boot/axios';
import { useAuthStore } from 'src/stores/auth';
import type { MeInfo } from 'src/types/user'
import type { ChannelVisual, CreateChannelPayload } from 'src/types/channels';

export interface resData {
    user: MeInfo
    token: {
        token: string,
        type: string
    }
}

export function useApi() {
    const auth = useAuthStore();

    // auto-inject token into every request
    api.interceptors.request.use((config) => {
        if (auth.token && config.headers) {
            config.headers.Authorization = `Bearer ${auth.token}`;
        }
        return config;
    });

    //AUTH
    async function register(first_name: string, last_name: string, nickname: string, email: string, password: string) {
        const res = await api.post<resData>('/register', { first_name, last_name, nickname, email, password });
        auth.setToken(res.data.token.token);
        // server returns MeInfo which includes settings
        auth.setUser(res.data.user)
        auth.setSettings(res.data.user.settings ?? null)
        return res.data;

    }

    async function login(email: string, password: string) {
        const res = await api.post<resData>('/login', { email, password });
        auth.setToken(res.data.token.token);
        auth.setUser(res.data.user)
        auth.setSettings(res.data.user.settings ?? null)
        return res.data;
    }

    function logout() {
        auth.logout();
    }

    //USER

    //CHANNELS
    async function getChannels(): Promise<ChannelVisual[]> {
        const res = await api.get<{ channels: ChannelVisual[] }>('/channels')
        return res.data.channels
    }

    async function createChannel(payload: CreateChannelPayload): Promise<ChannelVisual> {
        const res = await api.post<ChannelVisual>('/channels', payload)
        return res.data
    }

    return {
        register,
        login,
        logout,
        getChannels,
        createChannel
    };
}
