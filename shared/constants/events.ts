import { IStory } from "@shared/story.js";
import { IChat } from "@shared/chat.js";
import { IUser } from "@shared/user.js";

/**
 * Socket.io Event Names
 * Used for type-safe communication between frontend and gateway
 */
export enum SocketEvents {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',

  // Message events
  SEND_MESSAGE = 'sendMessage',
  NEW_MESSAGE = 'newMessage',
  MESSAGE_SENT = 'messageSent',
  MESSAGE_ERROR = 'messageError',

  // User presence events
  USER_ONLINE = 'userOnline',
  USER_OFFLINE = 'userOffline',

  // Typing events
  TYPING_START = 'typingStart',
  TYPING_STOP = 'typingStop',

  // Deletion events
  MESSAGE_DELETED = 'messageDeleted',
  // Chat events
  NEW_CHAT = 'newChat',
  CHAT_DELETED = 'chatDeleted',

  // Story events
  NEW_STORY = 'newStory',

  // Error events
  ERROR = 'error',
  UNAUTHORIZED = 'unauthorized',
}

/**
 * Pub/Sub Channel Names
 * Used for inter-service communication
 */
export enum PubSubChannels {
  // Message channels
  NEW_MESSAGE = 'chat:new_message',
  MESSAGE_UPDATED = 'chat:message_updated',
  MESSAGE_DELETED = 'chat:message_deleted',

  // User channels
  USER_STATUS = 'chat:user_status',
  USER_TYPING = 'chat:user_typing',

  // Chat channels
  CHAT_CREATED = 'chat:created',
  CHAT_UPDATED = 'chat:updated',
  CHAT_DELETED = 'chat:deleted',

  // Story channels
  NEW_STORY = 'chat:new_story',
}

/**
 * Generic Pub/Sub Message Payload Types
 */
export interface PubSubNewMessagePayload {
  chatId: string;
  messageId: string;
  senderId: string;
  receiverIds: string[];
  text: string;
  createdAt: string;
}

export interface PubSubUserStatusPayload {
  userId: string;
  isOnline: boolean;
}

export interface PubSubUserTypingPayload {
  userId: string;
  chatId: string;
  isTyping: boolean;
  receiverIds: string[];
}

export interface PubSubMessageDeletedPayload {
  messageId: string;
  chatId: string;
  userId?: string;
  forEveryone: boolean;
  receiverIds: string[];
}

export interface PubSubChatCreatedPayload {
  chat: IChat<IUser>;
  receiverIds: string[];
}

export interface PubSubChatDeletedPayload {
  chatId: string;
  userId: string;
  receiverIds: string[];
}

export interface PubSubNewStoryPayload {
  userId: string;
  story: IStory;
  receiverIds: string[];
}
