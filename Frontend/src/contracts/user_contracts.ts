import type { UserStatus } from 'src/enums/global_enums';

// --- DTOs (Data Transfer Objects) ---
export interface UserDto {
  id: string;
  nickname: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  lastSeenAt: string | null;
}

export interface UserSettingsDto {
  status: UserStatus;
  notificationsEnabled: boolean;
  directNotificationsOnly: boolean;
}

export interface UserFullDto extends UserDto {
  email: string;
  settings: UserSettingsDto;
}

// --- PAYLOADS ---

export interface UpdateSettingsPayload {
  status?: UserStatus;
  notificationsEnabled?: boolean;
  directNotificationsOnly?: boolean;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  email?: string;
}

// --- EVENTS ---

export interface UserStatusEvent {
  userId: string;
  status: UserStatus;
}
