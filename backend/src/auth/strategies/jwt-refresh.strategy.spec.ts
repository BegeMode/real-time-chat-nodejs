/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthService } from '@auth/auth.service.js';
import { JwtRefreshStrategy } from '@auth/strategies/jwt-refresh.strategy.js';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;
  let authService: any;
  let configService: any;

  beforeEach(async () => {
    authService = {
      validateUser: vi.fn(),
    };
    configService = {
      get: vi.fn().mockReturnValue('refresh_secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtRefreshStrategy,
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    strategy = module.get<JwtRefreshStrategy>(JwtRefreshStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate and return the user with refresh token', async () => {
      const user = { _id: 'user123', email: 'test@test.com' };
      const req = { cookies: { refreshToken: 'token123' } };
      authService.validateUser.mockResolvedValue(user);

      const result = await strategy.validate(req as any, {
        sub: 'user123',
        email: 'test@test.com',
      });

      expect(result).toEqual({
        sub: 'user123',
        email: 'test@test.com',
        _id: 'user123',
        refreshToken: 'token123',
      });
    });

    it('should throw UnauthorizedException if refresh token missing in cookies', async () => {
      const req = { cookies: {} };
      await expect(
        strategy.validate(req as any, { sub: 'user123', email: 't@t.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const user = null;
      const req = { cookies: { refreshToken: 'token123' } };
      authService.validateUser.mockResolvedValue(user);

      await expect(
        strategy.validate(req as any, { sub: 'user123', email: 't@t.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
