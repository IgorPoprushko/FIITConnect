import type User from '#models/user'
import type { AccessToken } from '@adonisjs/auth/access_tokens'

// *** Payloads ***

export interface RegisterPayload {
  first_name: string
  last_name: string
  nickname: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

// *** Responses ***

export interface AuthResponse {
  user: ReturnType<User['serialize']>
  token: AccessToken
}
export interface MeResponse {
  user: ReturnType<User['serialize']>
}
