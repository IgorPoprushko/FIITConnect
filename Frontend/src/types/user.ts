export interface UserDto {
    id: string
    email: string
    // camelCase
    firstName: string
    lastName: string
    nickname: string
    lastSeenAt?: string | null
    createdAt: string
    updatedAt: string
}
