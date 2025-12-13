export interface BaseResponse<T = any> {
  status: 'ok' | 'error'
  message?: string
  data?: T
}
