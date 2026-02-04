/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, type TestingModule } from '@nestjs/testing';
import { UsersController } from '@users/users.controller.js';
import { UsersService } from '@users/users.service.js';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('UsersController', () => {
  let controller: UsersController;
  let service: any;

  const mockUserId = new Types.ObjectId().toString();

  beforeEach(async () => {
    service = {
      searchUsers: vi.fn(),
      toUserResponse: vi.fn().mockImplementation((u: any) => u),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should return empty success if query is empty', async () => {
      const result = await controller.search(
        '',
        mockUserId,
        new AbortController().signal,
      );
      expect(result).toEqual({ success: true, data: [] });
      expect(service.searchUsers).not.toHaveBeenCalled();
    });

    it('should call service.searchUsers if query is provided', async () => {
      const mockSignal = new AbortController().signal;
      service.searchUsers.mockResolvedValue([{ _id: 'u1', username: 'test' }]);
      const result = await controller.search('test', mockUserId, mockSignal);
      expect(service.searchUsers).toHaveBeenCalledWith(
        'test',
        mockUserId,
        mockSignal,
      );
      expect(result).toHaveLength(1);
    });
  });
});
