/* eslint-disable sonarjs/no-hardcoded-passwords */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { InternalServerErrorException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { User } from '@users/models/user.js';
import { UsersService } from '@users/users.service.js';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('UsersService', () => {
  let service: UsersService;
  let userModel: any;

  const mockUserId = new Types.ObjectId().toString();

  beforeEach(async () => {
    const mockUserConstructor = vi.fn().mockImplementation(function (
      this: any,
      dto: any,
    ) {
      this.save = vi.fn().mockResolvedValue({ _id: mockUserId, ...dto });
      Object.assign(this, dto);
    });

    userModel = mockUserConstructor;
    userModel.find = vi.fn();
    userModel.findOne = vi.fn();
    userModel.findById = vi.fn();
    userModel.findByIdAndUpdate = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user and return lean object', async () => {
      const email = 'test@example.com';
      const username = 'testuser';
      const password = 'hashedPassword';

      userModel.findById.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue({ _id: mockUserId, email, username }),
      });

      const result = await service.create(email, username, password);

      expect(userModel).toHaveBeenCalledWith({ email, username, password });
      expect(result.email).toBe(email);
      expect(result._id).toBe(mockUserId);
    });

    it('should throw InternalServerErrorException if user not found after creation', async () => {
      userModel.findById.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(service.create('e', 'u', 'p')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user if found', async () => {
      userModel.findOne.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue({ email: 'test@example.com' }),
      });

      const result = await service.findByEmail('test@example.com');
      expect(result?.email).toBe('test@example.com');
    });
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      userModel.findById.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue({ _id: mockUserId }),
      });

      const result = await service.findById(mockUserId);
      expect(result?._id).toBe(mockUserId);
    });
  });

  describe('searchUsers', () => {
    it('should return users matching query', async () => {
      userModel.find.mockReturnValue({
        limit: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([{ username: 'test' }]),
      });

      const result = await service.searchUsers('test', mockUserId);
      expect(result).toHaveLength(1);
      expect(userModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: { $ne: mockUserId },
        }),
        null,
        expect.any(Object),
      );
    });

    it('should pass signal to mongoose', async () => {
      userModel.find.mockReturnValue({
        limit: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      });

      const controller = new AbortController();
      await service.searchUsers('test', mockUserId, controller.signal);

      expect(userModel.find).toHaveBeenCalledWith(expect.any(Object), null, {
        signal: controller.signal,
      });
    });
  });

  describe('updateRefreshToken', () => {
    it('should call findByIdAndUpdate', async () => {
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({}),
      });

      await service.updateRefreshToken(mockUserId, 'token');
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(mockUserId, {
        refreshToken: 'token',
      });
    });
  });
});
