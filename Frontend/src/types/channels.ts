export enum ChannelType {
    PRIVATE = 'private',
    PUBLIC = 'public',
}

export interface CreateChannelPayload {
    name: string
    description: string
    type: 'PUBLIC' | 'PRIVATE'
}

export interface ChannelInfo {
    id: string
    name: string
    description?: string | null
    type?: string
    ownerUserId?: string
    lastMessageAt?: string | null
    createdAt?: string
    updatedAt?: string
}