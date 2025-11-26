export enum UserRole {
    ADMIN = 1,
    MEMBER = 0,
}
export interface UserPayload {
    email: string
    firstName: string
    lastName: string
    nickname: string
    status?: string
    createdAt: string
    updatedAt: string
    directNotificationsOnly: boolean
}

export interface UserInfo {
    id: string
    email: string
    firstName: string
    lastName: string
    nickname: string
    isOnline: boolean
    lastSeenAt?: Date | null
    createdAt: Date
    updatedAt: Date
}

export interface Settings {
    status: number
    notificationsEnabled: boolean
    directNotificationsOnly: boolean
}

export interface MeInfo extends UserInfo {
    settings: Settings
}