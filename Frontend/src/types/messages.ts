export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderNickname: string;
  content: string;
  createdAt: string | Date;
  isRead: boolean;
  isOwn: boolean;
}

// UI-friendly version used by chat components
export interface IMessage {
  id: string;
  channelId: string;
  sender: string;
  avatar?: string;
  text: string;
  date: Date;
  own: boolean;
  read: boolean;
}

export type DoneFunction = (stop?: boolean) => void;

export const mapChatMessageToDisplay = (message: ChatMessage): IMessage => ({
  id: message.id,
  channelId: message.channelId,
  sender: message.senderNickname,
  text: message.content,
  date: new Date(message.createdAt),
  own: message.isOwn,
  read: message.isRead,
});
