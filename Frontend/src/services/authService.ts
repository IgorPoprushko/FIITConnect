import type { AuthResponse, RegisterPayload, LoginPayload } from 'src/contracts/auth_contracts';
import { httpClient } from './httpClient';
import { useAuthStore } from 'src/stores/auth';

class AuthService {
  async register(
    firstName: string,
    lastName: string,
    nickname: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    const payload: RegisterPayload = {
      first_name: firstName,
      last_name: lastName,
      nickname,
      email,
      password,
    };

    const response = await httpClient.post<AuthResponse>('/auth/register', payload);

    this.persistAuth(response.data);
    return response.data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const payload: LoginPayload = {
      email,
      password,
    };

    const response = await httpClient.post<AuthResponse>('/auth/login', payload);
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
