import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from '@users/users.service.js';
import { User } from '@users/models/user.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('UsersService', () => {
  let service: UsersService;
  const mockUserModel = {
    new: vi.fn().mockImplementation((value) => value),
    constructor: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    exec: vi.fn(),
    save: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
