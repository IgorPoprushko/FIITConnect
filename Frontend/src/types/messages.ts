export interface IMessage {
    id: number
    sender: string
    avatar: string
    text: string
    date: Date
    own: boolean
    read: boolean
}

export type DoneFunction = (stop?: boolean) => void;
