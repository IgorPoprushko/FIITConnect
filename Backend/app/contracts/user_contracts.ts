import { UserStatus } from '#enums/global_enums'

// --- DTOs (Data Transfer Objects) ---

// Публічна інформація про юзера (для чату, списків)
export interface UserDto {
  id: string
  nickname: string
  firstName: string
  lastName: string
  status: UserStatus
  lastSeenAt: string | null // ISO Date
}

// Налаштування (тільки те, що є в моделі Setting)
export interface UserSettingsDto {
  status: UserStatus
  notificationsEnabled: boolean
  directNotificationsOnly: boolean
}

// Повна інформація про себе (для init/profile)
export interface UserFullDto extends UserDto {
  email: string
  settings: UserSettingsDto
}

// --- PAYLOADS ---

export interface UpdateSettingsPayload {
  // Partial дозволяє слати лише один параметр
  status?: UserStatus
  notificationsEnabled?: boolean
  directNotificationsOnly?: boolean
}

// --- EVENTS ---

export interface UserStatusEvent {
  userId: string
  status: UserStatus
}
