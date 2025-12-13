import type { UserStatus } from 'src/enums/global_enums';

export interface UserDto {
  id: string;
  nickname: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  lastSeenAt: string | null; // Приходить як ISO рядок "2023-12-13T10:00..."
}

// Налаштування
export interface UserSettingsDto {
  status: UserStatus;
  notificationsEnabled: boolean;
  directNotificationsOnly: boolean;
}

// Повна інформація (те, що бачу я про себе)
export interface UserFullDto extends UserDto {
  email: string;
  settings: UserSettingsDto;
}

// --- PAYLOADS (Що відправляємо на бек) ---

export interface UpdateSettingsPayload {
  status?: UserStatus;
  notificationsEnabled?: boolean;
  directNotificationsOnly?: boolean;
}

// --- EVENTS (Що прилітає з сокета) ---

export interface UserStatusEvent {
  userId: string;
  status: UserStatus;
}
