/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable sonarjs/no-hardcoded-passwords */
/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthController } from '@auth/auth.controller.js';
import { AuthService } from '@auth/auth.service.js';
import { Test, type TestingModule } from '@nestjs/testing';
import { UsersService } from '@users/users.service.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;
  let usersService: any;

  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    username: 'testuser',
  };

  const mockAuthResponse = {
    user: { id: 'user123', email: 'test@example.com', username: 'testuser' },
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
  };

  const mockResponse = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as any;

  beforeEach(async () => {
    authService = {
      register: vi.fn().mockResolvedValue(mockAuthResponse),
      login: vi.fn().mockResolvedValue(mockAuthResponse),
      refresh: vi.fn().mockResolvedValue({ accessToken: 'new_access_token' }),
      logout: vi.fn().mockResolvedValue(undefined),
    };

    usersService = {
      toUserResponse: vi.fn().mockReturnValue(mockAuthResponse.user),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register and set cookie', async () => {
      const dto = {
        email: 'test@example.com',
        username: 'test',
        password: 'password',
      };
      const result = await controller.register(dto as any, mockResponse);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh_token',
        expect.any(Object),
      );
      expect(result).toEqual({
        user: mockAuthResponse.user,
        accessToken: 'access_token',
      });
    });
  });

  describe('login', () => {
    it('should call authService.login and set cookie', async () => {
      const dto = { email: 'test@example.com', password: 'password' };
      const result = await controller.login(dto as any, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh_token',
        expect.any(Object),
      );
      expect(result).toEqual({
        user: mockAuthResponse.user,
        accessToken: 'access_token',
      });
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh', async () => {
      const result = await controller.refresh('user123', 'old_refresh_token');
      expect(authService.refresh).toHaveBeenCalledWith(
        'user123',
        'old_refresh_token',
      );
      expect(result).toEqual({ accessToken: 'new_access_token' });
    });
  });

  describe('logout', () => {
    it('should call authService.logout and clear cookie', async () => {
      const result = await controller.logout('user123', mockResponse);

      expect(authService.logout).toHaveBeenCalledWith('user123');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('getMe', () => {
    it('should return user info', () => {
      const result = controller.getMe(mockUser as any);
      expect(usersService.toUserResponse).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockAuthResponse.user);
    });
  });
});
