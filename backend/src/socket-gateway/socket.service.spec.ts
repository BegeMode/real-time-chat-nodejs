/* eslint-disable unicorn/consistent-function-scoping */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthService } from '@auth/auth.service.js';
import { SocketAuthGuard } from '@guards/socket-auth.guard.js';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SocketEvents } from '@shared/index.js';
import { SocketGatewayService } from '@socket-gateway/socket.service.js';
import { PinoLogger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('SocketGatewayService', () => {
  let gateway: SocketGatewayService;
  let jwtService: any;
  let configService: any;
  let authService: any;

  beforeEach(async () => {
    jwtService = {
      verifyAsync: vi.fn(),
    };
    configService = {
      get: vi.fn().mockReturnValue('secret'),
    };
    authService = {
      validateUser: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketGatewayService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: AuthService, useValue: authService },
        { provide: SocketAuthGuard, useValue: {} },
        {
          provide: PinoLogger,
          useValue: {
            setContext: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<SocketGatewayService>(SocketGatewayService);

    gateway.server = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    } as any;
  });

  const createMockSocket = () =>
    ({
      id: 'socket_123',
      handshake: {
        auth: { token: 'valid_token' },
        headers: {},
        query: {},
      },
      join: vi.fn().mockResolvedValue(true),
      emit: vi.fn(),
      disconnect: vi.fn(),
    }) as any;

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should verify token, join room and broadcast online status', async () => {
      const socket = createMockSocket();
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

      await gateway.handleConnection(socket);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'valid_token',
        expect.any(Object),
      );
      expect(socket.join).toHaveBeenCalledWith('user:user123');
      expect(gateway.server.emit).toHaveBeenCalledWith(
        SocketEvents.USER_ONLINE,
        { userId: 'user123' },
      );
    });

    it('should disconnect if token verification fails', async () => {
      const socket = createMockSocket();
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.emit).toHaveBeenCalledWith(SocketEvents.UNAUTHORIZED, {
        message: 'Invalid token',
      });
    });
  });

  describe('handleDisconnect', () => {
    it('should broadcast offline status when last socket of user disconnects', async () => {
      const socket = createMockSocket();
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user123' });

      // Connect first
      await gateway.handleConnection(socket);

      // Disconnect
      gateway.handleDisconnect(socket);

      expect(gateway.server.emit).toHaveBeenCalledWith(
        SocketEvents.USER_OFFLINE,
        { userId: 'user123' },
      );
    });
  });
});
