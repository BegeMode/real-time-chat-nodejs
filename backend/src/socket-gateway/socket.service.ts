import { IAuthenticatedSocket } from '@app-types/authenticated-socket.js';
import { IJwtPayload } from '@app-types/jwt-payload.js';
import { SocketAuthGuard } from '@guards/socket-auth.guard.js';
import { Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
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

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  // --- SocketTransport Implementation ---

  emitToUsers(userIds: string[], event: SocketEvents, payload: unknown): void {
    const rooms = userIds.map((id) => `user:${id}`);
    this.server.to(rooms).emit(event, payload);
    this.logger.debug(`Emitted event ${event} to users: ${userIds.join(', ')}`);
  }

  emitToUser(userId: string, event: SocketEvents, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
    this.logger.debug(`Emitted event ${event} to user ${userId}`);
  }

  getConnectedUserIds(): string[] {
    return [...this.userSockets.keys()];
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  broadcast(event: SocketEvents, payload: unknown): void {
    this.server.emit(event, payload);
  }

  // --- NestJS Gateway Lifecycle & Handlers ---

  afterInit(): void {
    this.logger.log('Socket Gateway initialized');
  }

  async handleConnection(client: Socket): Promise<void> {
    this.logger.debug(`Client attempting to connect: ${client.id}`);

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

      // Verify token manually during handshake
      const payload = (await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      })) satisfies IJwtPayload;

      if (!payload.sub) {
        throw new Error('Invalid token payload');
      }

      const userId = payload.sub;
      const authenticatedClient = client as IAuthenticatedSocket;
      authenticatedClient.userId = userId;

      // Automatically join personal channel
      await client.join(`user:${userId}`);

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
        this.broadcast(SocketEvents.USER_ONLINE, { userId });
      }

      this.userSockets.get(userId)?.add(client.id);

      this.logger.log(
        `Client connected and authenticated: ${client.id} (User: ${userId}) joined personal channel user:${userId}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Connection authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit(SocketEvents.UNAUTHORIZED, { message: 'Invalid token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const authenticatedClient = client as IAuthenticatedSocket;
    const userId = authenticatedClient.userId;

    if (userId) {
      const userSocketSet = this.userSockets.get(userId);

      if (userSocketSet) {
        userSocketSet.delete(client.id);

        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
          this.broadcast(SocketEvents.USER_OFFLINE, { userId });
        }
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(SocketAuthGuard)
  @SubscribeMessage(SocketEvents.TYPING_START)
  handleTypingStart(
    @MessageBody() payload: { chatId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const authClient = client as IAuthenticatedSocket;

    // We don't broadcast here directly anymore, we expect the API to handle the logic
    // OR if you want direct bridge, we could, but let's stick to your architecture
    this.logger.debug(
      `User ${authClient.userId} is typing in ${payload.chatId}`,
    );
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
