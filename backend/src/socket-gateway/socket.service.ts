import { IAuthenticatedSocket } from '@app-types/authenticated-socket.js';
import type { IJoinRoomPayload } from '@app-types/join-room-payload.js';
import type { ISendMessagePayload } from '@app-types/send-message-payload.js';
import { SocketAuthGuard } from '@guards/socket-auth.guard.js';
import { Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  RedisChannels,
  RedisNewMessagePayload,
  SocketEvents,
} from '@shared/index.js';
import { RedisService } from '@socket-gateway/redis.service.js';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/',
})
export class SocketGatewayService
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;

  // Map of userId to socket IDs for direct messaging
  private userSockets = new Map<string, Set<string>>();

  private readonly logger = new Logger(SocketGatewayService.name, {
    timestamp: true,
  });

  constructor(private readonly redisService: RedisService) {}

  afterInit(): void {
    this.logger.log('Socket Gateway initialized');

    // Subscribe to Redis new message events
    this.redisService.onMessage(RedisChannels.NEW_MESSAGE, (payload) => {
      this.handleRedisNewMessage(payload as RedisNewMessagePayload);
    });
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client attempting to connect: ${client.id}`);

    // The SocketAuthGuard is not automatically applied on connection
    // We need to manually verify the token here
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`No token provided for client: ${client.id}`);
        client.emit(SocketEvents.UNAUTHORIZED, {
          message: 'No token provided',
        });
        client.disconnect(true);

        return;
      }

      // Token validation will happen in the guard for message handlers
      // For now, we just log the connection
      this.logger.log(`Client connected: ${client.id}`);
    } catch (error: unknown) {
      this.logger.error(
        `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const authenticatedClient = client as IAuthenticatedSocket;

    if (authenticatedClient.userId) {
      // Remove socket from user's socket set
      const userSocketSet = this.userSockets.get(authenticatedClient.userId);

      if (userSocketSet) {
        userSocketSet.delete(client.id);

        if (userSocketSet.size === 0) {
          this.userSockets.delete(authenticatedClient.userId);
          // Broadcast user offline status
          this.server.emit(SocketEvents.USER_OFFLINE, {
            userId: authenticatedClient.userId,
          });
        }
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(SocketAuthGuard)
  @SubscribeMessage(SocketEvents.JOIN_ROOM)
  handleJoinRoom(
    @MessageBody() payload: IJoinRoomPayload,
    @ConnectedSocket() client: Socket,
  ): void {
    const { chatId } = payload;
    const authClient = client as IAuthenticatedSocket;

    // Register user socket mapping
    if (!this.userSockets.has(authClient.userId)) {
      this.userSockets.set(authClient.userId, new Set());
      // Broadcast user online status (only on first socket)
      this.server.emit(SocketEvents.USER_ONLINE, { userId: authClient.userId });
    }

    this.userSockets.get(authClient.userId)?.add(client.id);

    // Join the conversation room
    void client.join(`conversation:${chatId}`);

    client.emit(SocketEvents.ROOM_JOINED, { chatId });
    this.logger.log(
      `User ${authClient.userId} joined room: conversation:${chatId}`,
    );
  }

  @UseGuards(SocketAuthGuard)
  @SubscribeMessage(SocketEvents.LEAVE_ROOM)
  handleLeaveRoom(
    @MessageBody() payload: IJoinRoomPayload,
    @ConnectedSocket() client: Socket,
  ): void {
    const { chatId } = payload;
    const authClient = client as IAuthenticatedSocket;

    void client.leave(`conversation:${chatId}`);
    this.logger.log(
      `User ${authClient.userId} left room: conversation:${chatId}`,
    );
  }

  @UseGuards(SocketAuthGuard)
  @SubscribeMessage(SocketEvents.TYPING_START)
  handleTypingStart(
    @MessageBody() payload: IJoinRoomPayload,
    @ConnectedSocket() client: Socket,
  ): void {
    const { chatId } = payload;
    const authClient = client as IAuthenticatedSocket;

    // Broadcast to room except sender
    client.to(`conversation:${chatId}`).emit(SocketEvents.TYPING_START, {
      userId: authClient.userId,
      chatId,
    });
  }

  @UseGuards(SocketAuthGuard)
  @SubscribeMessage(SocketEvents.TYPING_STOP)
  handleTypingStop(
    @MessageBody() payload: IJoinRoomPayload,
    @ConnectedSocket() client: Socket,
  ): void {
    const { chatId } = payload;
    const authClient = client as IAuthenticatedSocket;

    client.to(`conversation:${chatId}`).emit(SocketEvents.TYPING_STOP, {
      userId: authClient.userId,
      chatId,
    });
  }

  @UseGuards(SocketAuthGuard)
  @SubscribeMessage(SocketEvents.SEND_MESSAGE)
  handleSendMessage(
    @MessageBody() _payload: ISendMessagePayload,
    @ConnectedSocket() client: Socket,
  ): void {
    const authClient = client as IAuthenticatedSocket;
    // This is a fallback - messages should be sent via REST API
    // But we can emit an event to acknowledge receipt
    this.logger.warn(
      `Direct socket message from ${authClient.userId} - should use REST API`,
    );

    client.emit(SocketEvents.MESSAGE_ERROR, {
      message: 'Please use REST API to send messages',
    });
  }

  /**
   * Handle new message events from Redis (published by API service)
   */
  private handleRedisNewMessage(payload: RedisNewMessagePayload): void {
    this.logger.log(
      `Received new message from Redis for conversation: ${payload.conversationId}`,
    );

    // Emit to the conversation room
    this.server
      .to(`conversation:${payload.conversationId}`)
      .emit(SocketEvents.NEW_MESSAGE, {
        _id: payload.messageId,
        conversationId: payload.conversationId,
        senderId: payload.senderId,
        text: payload.text,
        createdAt: payload.createdAt,
      });

    // Also emit directly to receiver if they're online but not in the room
    const receiverSockets = this.userSockets.get(payload.receiverId);

    if (receiverSockets) {
      for (const socketId of receiverSockets) {
        const socket = this.server.sockets.sockets.get(socketId);

        if (
          socket &&
          !socket.rooms.has(`conversation:${payload.conversationId}`)
        ) {
          socket.emit(SocketEvents.NEW_MESSAGE, {
            _id: payload.messageId,
            conversationId: payload.conversationId,
            senderId: payload.senderId,
            text: payload.text,
            createdAt: payload.createdAt,
          });
        }
      }
    }
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth.token as string | undefined;
    if (authToken) return authToken;

    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

    const queryToken = client.handshake.query.token as string | undefined;
    if (queryToken) return queryToken;

    return null;
  }
}
