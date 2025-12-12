import type { MeInfo } from 'src/types/user';
import { httpClient } from './httpClient';
import { useAuthStore } from 'src/stores/auth';

interface TokenInfo {
  token: string;
  type: string;
}

export interface AuthResponse {
  user: MeInfo;
  token: TokenInfo;
}

class AuthService {
  async register(
    firstName: string,
    lastName: string,
    nickname: string,
    email: string,
    password: string
  ): Promise<AuthResponse> {
    const response = await httpClient.post<AuthResponse>(
      '/auth/register',
      {
        first_name: firstName,
        last_name: lastName,
        nickname,
        email,
        password,
      }
    );
    this.persistAuth(response.data);
    return response.data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await httpClient.post<AuthResponse>(
      '/auth/login',
      { email, password }
    );
    this.persistAuth(response.data);
    return response.data;
  }

  async logout(): Promise<void> {
    await httpClient.post('/auth/logout');
    useAuthStore().logout();
  }

  private persistAuth(data: AuthResponse) {
    const auth = useAuthStore();
    auth.setToken(data.token.token);
    auth.setUser(data.user);
    auth.setSettings(data.user.settings ?? null);
  }
}

export const authService = new AuthService();
