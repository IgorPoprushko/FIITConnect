import { api } from 'boot/axios';
import { useAuthStore } from 'src/stores/auth';
import type { UserDto } from 'src/types/user'

export interface resData {
    user: UserDto
    token: {
        token: string,
        type: string
    }
}

export interface ChannelDto {
    id: string
    name: string
    description?: string | null
    type?: string
    ownerUserId?: string
    lastMessageAt?: string | null
    createdAt?: string
    updatedAt?: string
}

export interface CreateChannelPayload {
    name: string
    description?: string | null
    type?: 'public' | 'private'
}

export function useApi() {
    const auth = useAuthStore();

    async function login(email: string, password: string) {
        const res = await api.post<resData>('/login', { email, password });
        auth.setToken(res.data.token.token);
        auth.setUserFields(res.data.user)
        return res.data;
    }

    async function register(first_name: string, last_name: string, nickname: string, email: string, password: string) {
        const res = await api.post<resData>('/register', { first_name, last_name, nickname, email, password });
        auth.setToken(res.data.token.token);
        auth.setUserFields(res.data.user)
        return res.data;

    }

    function logout() {
        auth.logout();
    }

    // auto-inject token into every request
    api.interceptors.request.use((config) => {
        if (auth.token && config.headers) {
            config.headers.Authorization = `Bearer ${auth.token}`;
        }
        return config;
    });

    // Fetch channels (list of channels the user has access to)
    async function getChannels(): Promise<ChannelDto[]> {
        const res = await api.get<ChannelDto[]>('/channels')
        return res.data
    }

    // Create a new channel
    async function createChannel(payload: CreateChannelPayload): Promise<ChannelDto> {
        const res = await api.post<ChannelDto>('/channels', payload)
        return res.data
    }

    return {
        login,
        register,
        logout,
        getChannels,
        createChannel
    };
}
