import { IJwtPayload } from '@app-types/jwt-payload.js';
import { AuthService } from '@auth/auth.service.js';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SocketEvents } from '@shared/constants/events.js';
import { PinoLogger } from 'nestjs-pino';
import { Socket } from 'socket.io';

@Injectable()
export class SocketAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SocketAuthGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();

    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn('No token provided in socket connection');
        this.disconnectClient(client, 'No token provided');

        return false;
      }

      const payload = await this.verifyToken(token);

      if (!payload) {
        this.logger.warn('Invalid token in socket connection');
        this.disconnectClient(client, 'Invalid token');

        return false;
      }

      // Validate user exists in database
      const user = await this.authService.validateUser(payload.sub);

      if (!user) {
        this.logger.warn(`User not found: ${payload.sub}`);
        this.disconnectClient(client, 'User not found');

        return false;
      }

      // Attach user info to socket using type assertion
      (client as unknown as { userId: string }).userId = payload.sub;
      (client as unknown as { userEmail: string }).userEmail = payload.email;

      this.logger.info(`Socket authenticated for user: ${payload.sub}`);

      return true;
    } catch (error: unknown) {
      this.logger.error(
        `Socket authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.disconnectClient(client, 'Authentication error');

      return false;
    }
  }

  private extractToken(client: Socket): string | null {
    // Try to get token from auth object (preferred method)
    const authToken = client.handshake.auth.token as string | undefined;

    if (authToken) {
      return authToken;
    }

    // Fallback: Try to get token from headers
    const authHeader = client.handshake.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Fallback: Try to get token from query
    const queryToken = client.handshake.query.token as string | undefined;

    if (queryToken) {
      return queryToken;
    }

    return null;
  }

  private async verifyToken(token: string): Promise<IJwtPayload | null> {
    try {
      return await this.jwtService.verifyAsync<IJwtPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      return null;
    }
  }

  private disconnectClient(client: Socket, reason: string): void {
    client.emit(SocketEvents.UNAUTHORIZED, { message: reason });
    client.disconnect(true);
  }
}
