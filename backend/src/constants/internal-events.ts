export enum InternalEvents {
  SOCKET_TYPING = 'socket.typing',
}

export interface ISocketTypingPayload {
  userId: string;
  chatId: string;
  isTyping: boolean;
}
