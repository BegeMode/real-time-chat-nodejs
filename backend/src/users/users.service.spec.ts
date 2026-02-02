/* eslint-disable @typescript-eslint/no-unsafe-return */
import { getModelToken } from '@nestjs/mongoose';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { User } from '@users/models/user.js';
import { UsersService } from '@users/users.service.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
