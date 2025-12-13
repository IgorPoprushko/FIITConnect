import type { UserFullDto } from './user_contracts';

// *** Payloads (Вхідні дані форм) ***

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  nickname: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// *** Responses (Що відповідає сервер) ***

// Це структура токена AdonisJS
export interface ApiToken {
  type: string;
  token: string;
  expiresAt?: string | null;
}

export interface AuthResponse {
  user: UserFullDto;
  token: ApiToken; // На фронті це об'єкт, а не клас
}

export interface MeResponse {
  user: UserFullDto;
}
