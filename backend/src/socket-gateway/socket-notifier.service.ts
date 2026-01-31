import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  PubSubChannels,
  PubSubChatDeletedPayload,
  PubSubMessageDeletedPayload,
  PubSubNewMessagePayload,
  PubSubUserStatusPayload,
  PubSubUserTypingPayload,
  SocketEvents,
} from '@shared/index.js';
import { PubSubService } from '@socket-gateway/pub-sub.service.js';
import { SocketTransport } from '@socket-gateway/socket-transport.service.js';

@Injectable()
export class SocketNotifierService implements OnModuleInit {
  private readonly logger = new Logger(SocketNotifierService.name);

  constructor(
    private readonly pubSubService: PubSubService,
    private readonly transport: SocketTransport,
  ) {}

  onModuleInit(): void {
    this.logger.log('Socket Notifier initialized');

    // Subscribe to new message events
    this.pubSubService.onMessage(PubSubChannels.NEW_MESSAGE, (payload) => {
      this.handleNewMessage(payload as PubSubNewMessagePayload);
    });

    // Subscribe to typing status
    this.pubSubService.onMessage(PubSubChannels.USER_TYPING, (payload) => {
      this.handleUserTyping(payload as PubSubUserTypingPayload);
    });

    // Subscribe to user online/offline status
    this.pubSubService.onMessage(PubSubChannels.USER_STATUS, (payload) => {
      this.handleUserStatus(payload as PubSubUserStatusPayload);
    });

    // Subscribe to message deletion
    this.pubSubService.onMessage(PubSubChannels.MESSAGE_DELETED, (payload) => {
      this.handleMessageDeleted(payload as PubSubMessageDeletedPayload);
    });

    // Subscribe to chat deletion
    this.pubSubService.onMessage(PubSubChannels.CHAT_DELETED, (payload) => {
      this.handleChatDeleted(payload as PubSubChatDeletedPayload);
    });
  }

  private handleNewMessage(payload: PubSubNewMessagePayload): void {
    const channelName = `chat:${payload.chatId}`;
    const socketPayload = {
      _id: payload.messageId,
      chatId: payload.chatId,
      senderId: payload.senderId,
      text: payload.text,
      createdAt: payload.createdAt,
    };

    // Emit to the chat channel (all users currently looking at this chat)
    this.transport.emitToChannel(
      channelName,
      SocketEvents.NEW_MESSAGE,
      socketPayload,
    );

    // Also emit directly to receivers if they are online but not focused on this channel
    for (const receiverId of payload.receiverIds) {
      if (receiverId === payload.senderId) continue;

      if (!this.transport.isUserInChannel(receiverId, channelName)) {
        this.transport.emitToUser(
          receiverId,
          SocketEvents.NEW_MESSAGE,
          socketPayload,
        );
      }
    }
  }

  private handleUserTyping(payload: PubSubUserTypingPayload): void {
    const channelName = `chat:${payload.chatId}`;
    // We only broadcast typing to the channel
    this.transport.emitToChannel(channelName, SocketEvents.TYPING_START, {
      userId: payload.userId,
      chatId: payload.chatId,
      isTyping: payload.isTyping,
    });
  }

  private handleUserStatus(payload: PubSubUserStatusPayload): void {
    const event = payload.isOnline
      ? SocketEvents.USER_ONLINE
      : SocketEvents.USER_OFFLINE;
    this.transport.broadcast(event, { userId: payload.userId });
  }

  private handleMessageDeleted(payload: PubSubMessageDeletedPayload): void {
    this.transport.emitToChannel(
      `chat:${payload.chatId}`,
      SocketEvents.MESSAGE_DELETED,
      {
        messageId: payload.messageId,
        chatId: payload.chatId,
      },
    );
  }

  private handleChatDeleted(payload: PubSubChatDeletedPayload): void {
    this.transport.emitToChannel(
      `chat:${payload.chatId}`,
      SocketEvents.CHAT_DELETED,
      {
        chatId: payload.chatId,
      },
    );
  }
}
