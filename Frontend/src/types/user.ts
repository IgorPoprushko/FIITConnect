export enum UserRole {
    ADMIN = 'admin',
    NORMAL = 'normal',
}

export interface UserInfo {
    id: string
    email: string
    firstName: string
    lastName: string
    nickname: string
    lastSeenAt?: string | null
    createdAt: string
    updatedAt: string,
    isOnline: boolean
}
