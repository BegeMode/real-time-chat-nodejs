import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  PubSubChannels,
  PubSubChatDeletedPayload,
  PubSubMessageDeletedPayload,
  PubSubNewMessagePayload,
  PubSubNewStoryPayload,
  PubSubUserStatusPayload,
  PubSubUserTypingPayload,
  SocketEvents,
} from '@shared/index.js';
import { PubSubService } from '@socket-gateway/interfaces/pub-sub.service.js';
import { SocketTransport } from '@socket-gateway/interfaces/socket-transport.service.js';

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

    // Subscribe to new story events
    this.pubSubService.onMessage(PubSubChannels.NEW_STORY, (payload) => {
      this.handleNewStory(payload as PubSubNewStoryPayload);
    });
  }

  private handleNewMessage(payload: PubSubNewMessagePayload): void {
    const socketPayload = {
      _id: payload.messageId,
      chatId: payload.chatId,
      senderId: payload.senderId,
      text: payload.text,
      createdAt: payload.createdAt,
    };

    // Emit to all participants (their personal channels)
    this.transport.emitToUsers(
      payload.receiverIds,
      SocketEvents.NEW_MESSAGE,
      socketPayload,
    );
  }

  private handleUserTyping(payload: PubSubUserTypingPayload): void {
    // Only send to other participants, not the typer themselves (unless they have other tabs)
    // Actually, sending to all is safer for multi-tab sync
    this.transport.emitToUsers(
      payload.receiverIds,
      payload.isTyping ? SocketEvents.TYPING_START : SocketEvents.TYPING_STOP,
      {
        userId: payload.userId,
        chatId: payload.chatId,
      },
    );
  }

  private handleUserStatus(payload: PubSubUserStatusPayload): void {
    const event = payload.isOnline
      ? SocketEvents.USER_ONLINE
      : SocketEvents.USER_OFFLINE;
    this.transport.broadcast(event, { userId: payload.userId });
  }

  private handleMessageDeleted(payload: PubSubMessageDeletedPayload): void {
    this.transport.emitToUsers(
      payload.receiverIds,
      SocketEvents.MESSAGE_DELETED,
      {
        messageId: payload.messageId,
        chatId: payload.chatId,
      },
    );
  }

  private handleChatDeleted(payload: PubSubChatDeletedPayload): void {
    this.transport.emitToUsers(payload.receiverIds, SocketEvents.CHAT_DELETED, {
      chatId: payload.chatId,
    });
  }

  private handleNewStory(payload: PubSubNewStoryPayload): void {
    this.transport.emitToUsers(payload.receiverIds, SocketEvents.NEW_STORY, {
      story: payload.story,
    });
  }
}
