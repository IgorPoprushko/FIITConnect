export enum UserStatus {
  OFFLINE = 0,
  ONLINE = 1,
  DND = 2,
}

export enum ChannelType {
  PUBLIC = 0,
  PRIVATE = 1,
}

export enum UserRole {
  MEMBER = 0,
  ADMIN = 1,
}

export interface BaseResponse<T> {
  status: 'ok' | 'error';
  message?: string;
  data?: T;
}
