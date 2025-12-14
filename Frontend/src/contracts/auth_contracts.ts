import type { UserFullDto } from './user_contracts';

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

export interface ApiToken {
  type: string;
  token: string;
  expiresAt?: string | null;
}

export interface AuthResponse {
  user: UserFullDto;
  token: ApiToken;
}

export interface MeResponse {
  user: UserFullDto;
}
