/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable sonarjs/no-hardcoded-passwords */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthService } from '@auth/auth.service.js';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { UsersService } from '@users/users.service.js';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed_value'),
  compare: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: any;
  let jwtService: any;
  let configService: any;

  const mockUser = {
    _id: { toString: () => 'user123' },
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashed_password',
    refreshToken: 'hashed_refresh_token',
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      updateRefreshToken: vi.fn(),
      toUserResponse: vi
        .fn()
        .mockReturnValue({ id: 'user123', email: 'test@example.com' }),
    };

    jwtService = {
      signAsync: vi.fn().mockResolvedValue('token'),
    };

    configService = {
      get: vi.fn().mockReturnValue('secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(usersService.create).toHaveBeenCalled();
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw ConflictException if user already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      const result = await service.refresh('user123', 'refresh_token');

      expect(result).toHaveProperty('accessToken');
      expect(jwtService.signAsync).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.refresh('user123', 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token invalid', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(service.refresh('user123', 'wrong_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should update refresh token to null', async () => {
      await service.logout('user123');
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        'user123',
        null,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user from service', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      const result = await service.validateUser('user123');
      expect(result).toBe(mockUser);
    });
  });
});
