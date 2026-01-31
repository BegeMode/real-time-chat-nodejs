import { IAuthenticatedSocket } from '@app-types/authenticated-socket.js';
import type { IJoinRoomPayload } from '@app-types/join-room-payload.js';
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
import { SocketEvents } from '@shared/index.js';
import { SocketTransport } from '@socket-gateway/socket-transport.service.js';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/',
})
export class SocketGatewayService
  extends SocketTransport
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;

  // Map of userId to socket IDs for direct messaging
  private userSockets = new Map<string, Set<string>>();

  private readonly logger = new Logger(SocketGatewayService.name, {
    timestamp: true,
  });

  // --- SocketTransport Implementation ---

  emitToChannel(channel: string, event: SocketEvents, payload: unknown): void {
    this.server.to(channel).emit(event, payload);
    this.logger.debug(`Emitted event ${event} to channel ${channel}`);
  }

  emitToUser(userId: string, event: SocketEvents, payload: unknown): void {
    const sockets = this.userSockets.get(userId);

    if (sockets) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, payload);
      }

      this.logger.debug(`Emitted event ${event} to user ${userId}`);
    }
  }

  joinChannel(client: Socket, channel: string): void {
    void client.join(channel);
    this.logger.log(`Client ${client.id} joined channel ${channel}`);
  }

  leaveChannel(client: Socket, channel: string): void {
    void client.leave(channel);
    this.logger.log(`Client ${client.id} left channel ${channel}`);
  }

  isUserInChannel(userId: string, channel: string): boolean {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return false;

    for (const socketId of sockets) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket?.rooms.has(channel)) return true;
    }

    return false;
  }

  getConnectedUserIds(): string[] {
    return [...this.userSockets.keys()];
  }

  broadcast(event: SocketEvents, payload: unknown): void {
    this.server.emit(event, payload);
  }

  // --- NestJS Gateway Lifecycle & Handlers ---

  afterInit(): void {
    this.logger.log('Socket Gateway initialized');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client attempting to connect: ${client.id}`);

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
      const userSocketSet = this.userSockets.get(authenticatedClient.userId);

      if (userSocketSet) {
        userSocketSet.delete(client.id);

        if (userSocketSet.size === 0) {
          this.userSockets.delete(authenticatedClient.userId);
          this.broadcast(SocketEvents.USER_OFFLINE, {
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
    const channelName = `chat:${chatId}`;

    if (!this.userSockets.has(authClient.userId)) {
      this.userSockets.set(authClient.userId, new Set());
      this.broadcast(SocketEvents.USER_ONLINE, { userId: authClient.userId });
    }

    this.userSockets.get(authClient.userId)?.add(client.id);
    this.joinChannel(client, channelName);

    client.emit(SocketEvents.ROOM_JOINED, { chatId });
    this.logger.log(`User ${authClient.userId} joined channel: ${channelName}`);
  }

  @UseGuards(SocketAuthGuard)
  @SubscribeMessage(SocketEvents.LEAVE_ROOM)
  handleLeaveRoom(
    @MessageBody() payload: IJoinRoomPayload,
    @ConnectedSocket() client: Socket,
  ): void {
    const { chatId } = payload;
    const authClient = client as IAuthenticatedSocket;
    const channelName = `chat:${chatId}`;

    this.leaveChannel(client, channelName);
    this.logger.log(`User ${authClient.userId} left channel: ${channelName}`);
  }

  @UseGuards(SocketAuthGuard)
  @SubscribeMessage(SocketEvents.TYPING_START)
  handleTypingStart(
    @MessageBody() payload: IJoinRoomPayload,
    @ConnectedSocket() client: Socket,
  ): void {
    const { chatId } = payload;
    const authClient = client as IAuthenticatedSocket;

    client.to(`chat:${chatId}`).emit(SocketEvents.TYPING_START, {
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

    client.to(`chat:${chatId}`).emit(SocketEvents.TYPING_STOP, {
      userId: authClient.userId,
      chatId,
    });
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
