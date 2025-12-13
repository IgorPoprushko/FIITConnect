export enum UserStatus {
  OFFLINE = 0,
  ONLINE = 1,
  DND = 2,
}

export enum ChannelType {
  PUBLIC = 0,
  PRIVATE = 1,
}
export interface BaseResponse<T = any> {
  status: 'ok' | 'error'
  message?: string
  data?: T
}
