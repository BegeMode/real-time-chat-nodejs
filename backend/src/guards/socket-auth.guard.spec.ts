/* eslint-disable unicorn/consistent-function-scoping */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthService } from '@auth/auth.service.js';
import { SocketAuthGuard } from '@guards/socket-auth.guard.js';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SocketEvents } from '@shared/index.js';
import { PinoLogger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('SocketAuthGuard', () => {
  let guard: SocketAuthGuard;
  let jwtService: any;
  let configService: any;
  let authService: any;
  let logger: any;

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
    logger = {
      setContext: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketAuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: AuthService, useValue: authService },
        { provide: PinoLogger, useValue: logger },
      ],
    }).compile();

    guard = module.get<SocketAuthGuard>(SocketAuthGuard);
  });

  const createMockContext = (handshake: any): ExecutionContext => {
    const client = {
      handshake,
      emit: vi.fn(),
      disconnect: vi.fn(),
    };

    return {
      switchToWs: () => ({
        getClient: () => client,
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access with valid token in auth object', async () => {
    const context = createMockContext({
      auth: { token: 'valid_token' },
      headers: {},
      query: {},
    });
    const client = context.switchToWs().getClient();

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user123',
      email: 'test@test.com',
    });
    authService.validateUser.mockResolvedValue({ _id: 'user123' });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(client.userId).toBe('user123');
    expect(authService.validateUser).toHaveBeenCalledWith('user123');
  });

  it('should deny access and disconnect if no token is provided', async () => {
    const context = createMockContext({
      auth: {},
      headers: {},
      query: {},
    });
    const client = context.switchToWs().getClient();

    const result = await guard.canActivate(context);

    expect(result).toBe(false);
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.emit).toHaveBeenCalledWith(
      SocketEvents.UNAUTHORIZED,
      expect.any(Object),
    );
  });

  it('should deny access if token is invalid', async () => {
    const context = createMockContext({
      auth: { token: 'invalid_token' },
      headers: {},
      query: {},
    });
    const client = context.switchToWs().getClient();

    jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

    const result = await guard.canActivate(context);

    expect(result).toBe(false);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('should try extraction from headers if auth object is empty', async () => {
    const context = createMockContext({
      auth: {},
      headers: { authorization: 'Bearer header_token' },
      query: {},
    });

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user123',
      email: 'test@test.com',
    });
    authService.validateUser.mockResolvedValue({ _id: 'user123' });

    await guard.canActivate(context);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      'header_token',
      expect.any(Object),
    );
  });
});
