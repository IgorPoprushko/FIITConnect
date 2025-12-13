// frontend/src/services/authService.ts

// Імпортуємо контракти (спільний стандарт)
import type { AuthResponse, RegisterPayload, LoginPayload } from 'src/contracts/auth_contracts';
import { httpClient } from './httpClient';
import { useAuthStore } from 'src/stores/auth';

/**
 * Примітка: Локальні інтерфейси AuthResponse та TokenInfo ВИДАЛЕНІ,
 * оскільки ми імпортуємо їх з 'src/contracts/auth_contracts'.
 */

class AuthService {
  async register(
    // Тепер ми приймаємо параметри, які відповідають структурі RegisterPayload
    firstName: string,
    lastName: string,
    nickname: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    // Створюємо payload, який іде на бекенд
    const payload: RegisterPayload = {
      first_name: firstName,
      last_name: lastName,
      nickname, // Примітка: тут ти використовуєш snake_case для полів бекенда, це ОК.
      email,
      password,
    };

    // Вказуємо очікуваний тип відповіді: AuthResponse
    const response = await httpClient.post<AuthResponse>('/auth/register', payload);

    this.persistAuth(response.data);
    return response.data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    // Створюємо payload
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

  // Приватний метод для збереження стану
  private persistAuth(data: AuthResponse) {
    const auth = useAuthStore();

    // data.token має тип ApiToken з контракту, а не TokenInfo
    auth.setToken(data.token.token);

    // data.user має тип UserFullDto
    auth.setUser(data.user);

    // Тепер ми точно знаємо, що data.user має поле settings завдяки UserFullDto
    auth.setSettings(data.user.settings ?? null);
  }
}

export const authService = new AuthService();
