import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '@auth/auth.service.js';
import { UsersService } from '@users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: vi.fn(),
    create: vi.fn(),
    updateRefreshToken: vi.fn(),
    toUserResponse: vi.fn(),
  };

  const mockJwtService = {
    signAsync: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
