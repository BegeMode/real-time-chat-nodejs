/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthService } from '@auth/auth.service.js';
import { JwtStrategy } from '@auth/strategies/jwt.strategy.js';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: any;
  let configService: any;

  beforeEach(async () => {
    authService = {
      validateUser: vi.fn(),
    };
    configService = {
      get: vi.fn().mockReturnValue('secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate and return the user', async () => {
      const user = { _id: 'user123', email: 'test@test.com' };
      authService.validateUser.mockResolvedValue(user);

      const result = await strategy.validate({
        sub: 'user123',
        email: 'test@test.com',
      });
      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate({ sub: 'user123', email: 'test@test.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
