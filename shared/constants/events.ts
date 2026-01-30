/**
 * Socket.io Event Names
 * Used for type-safe communication between frontend and gateway
 */
export enum SocketEvents {
  // Connection events
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',

  // Message events
  SEND_MESSAGE = 'sendMessage',
  NEW_MESSAGE = 'newMessage',
  MESSAGE_SENT = 'messageSent',
  MESSAGE_ERROR = 'messageError',

  // Room events
  JOIN_ROOM = 'joinRoom',
  LEAVE_ROOM = 'leaveRoom',
  ROOM_JOINED = 'roomJoined',

  // User presence events
  USER_ONLINE = 'userOnline',
  USER_OFFLINE = 'userOffline',

  // Typing events
  TYPING_START = 'typingStart',
  TYPING_STOP = 'typingStop',

  // Error events
  ERROR = 'error',
  UNAUTHORIZED = 'unauthorized',
}

/**
 * Redis Channel Names
 * Used for pub/sub communication between API and Gateway services
 */
export enum RedisChannels {
  // Message channels
  NEW_MESSAGE = 'chat:new_message',
  MESSAGE_UPDATED = 'chat:message_updated',
  MESSAGE_DELETED = 'chat:message_deleted',

  // User channels
  USER_STATUS = 'chat:user_status',
  USER_TYPING = 'chat:user_typing',

  // Conversation channels
  CONVERSATION_CREATED = 'chat:conversation_created',
  CONVERSATION_UPDATED = 'chat:conversation_updated',
}

/**
 * Redis Pub/Sub Message Payload Types
 */
export interface RedisNewMessagePayload {
  conversationId: string;
  messageId: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
}

export interface RedisUserStatusPayload {
  userId: string;
  status: 'online' | 'offline';
}

export interface RedisUserTypingPayload {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}
