/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable @typescript-eslint/dot-notation */
/* eslint-disable unicorn/consistent-function-scoping */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthService } from '@auth/auth.service.js';
import { InternalEvents } from '@constants/internal-events.js';
import { SocketAuthGuard } from '@guards/socket-auth.guard.js';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PubSubChannels, SocketEvents } from '@shared/index.js';
import { PubSubService } from '@socket-gateway/interfaces/pub-sub.service.js';
import { SocketGatewayService } from '@socket-gateway/socket.service.js';
import { PinoLogger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('SocketGatewayService', () => {
  let gateway: SocketGatewayService;
  let jwtService: any;
  let configService: any;
  let pubSubService: any;
  let eventEmitter: any;
  let authService: any;

  beforeEach(async () => {
    jwtService = {
      verifyAsync: vi.fn(),
    };
    configService = {
      get: vi.fn().mockReturnValue('secret'),
    };
    pubSubService = {
      isUserOnline: vi.fn(),
      setUserOnline: vi.fn().mockResolvedValue(true),
      setUserOffline: vi.fn().mockResolvedValue(true),
      publish: vi.fn(),
    };
    eventEmitter = {
      emit: vi.fn(),
    };
    authService = {
      validateUser: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketGatewayService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: PubSubService, useValue: pubSubService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: AuthService, useValue: authService },
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
    })
      .overrideGuard(SocketAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    gateway = module.get<SocketGatewayService>(SocketGatewayService);

    // Suppress logs during tests
    vi.spyOn(gateway['logger'], 'error').mockImplementation(() => undefined);
    vi.spyOn(gateway['logger'], 'warn').mockImplementation(() => undefined);
    vi.spyOn(gateway['logger'], 'log').mockImplementation(() => undefined);
    vi.spyOn(gateway['logger'], 'debug').mockImplementation(() => undefined);

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
      expect(pubSubService.publish).toHaveBeenCalledWith(
        PubSubChannels.USER_STATUS,
        { userId: 'user123', isOnline: true },
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

      await vi.waitFor(() => {
        expect(pubSubService.publish).toHaveBeenCalledWith(
          PubSubChannels.USER_STATUS,
          { userId: 'user123', isOnline: false },
        );
      });
    });
  });

  describe('Typing Events', () => {
    it('should emit typing start event to EventEmitter2', () => {
      const socket = createMockSocket();
      socket.userId = 'user123';
      const payload = { chatId: 'chat456' };

      gateway.handleTypingStart(payload, socket);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        InternalEvents.SOCKET_TYPING,
        {
          userId: 'user123',
          chatId: 'chat456',
          isTyping: true,
        },
      );
    });

    it('should emit typing stop event to EventEmitter2', () => {
      const socket = createMockSocket();
      socket.userId = 'user123';
      const payload = { chatId: 'chat456' };

      gateway.handleTypingStop(payload, socket);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        InternalEvents.SOCKET_TYPING,
        {
          userId: 'user123',
          chatId: 'chat456',
          isTyping: false,
        },
      );
    });
  });
});
