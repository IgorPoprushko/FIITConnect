import type User from '#models/user'
import type Setting from '#models/setting'
import { UserStatus } from '#enums/user_status'

// *** Payloads ***

export interface UpdateStatusPayload {
  status: UserStatus
}

export interface UpdateSettingsPayload {
  notificationsEnabled?: boolean
  directNotificationsOnly?: boolean
}

export interface GetUserByNicknamePayload {
  nickname: string
}

// *** Responses ***

export interface UserResponse {
  user: ReturnType<User['serialize']>
}

export interface UserStatusResponse {
  status: UserStatus
}

export interface SettingsResponse {
  setting: ReturnType<Setting['serialize']>
}

export interface UserStatusUpdateEvent {
  userId: string
  status: UserStatus
}
