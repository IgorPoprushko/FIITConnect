export enum UserRole {
    ADMIN = 1,
    MEMBER = 0,
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
