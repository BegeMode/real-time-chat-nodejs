/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, type TestingModule } from '@nestjs/testing';
import { StoriesController } from '@stories/stories.controller.js';
import { StoriesService } from '@stories/stories.service.js';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('StoriesController', () => {
  let controller: StoriesController;
  let service: any;

  const mockUserId = new Types.ObjectId().toString();

  beforeEach(async () => {
    service = {
      create: vi.fn(),
      findAllGroupedByUser: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoriesController],
      providers: [{ provide: StoriesService, useValue: service }],
    }).compile();

    controller = module.get<StoriesController>(StoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadStory', () => {
    it('should call service.create with parsed duration', async () => {
      const mockFile = { buffer: Buffer.from('test') } as any;
      service.create.mockResolvedValue({ _id: 'story1' });

      const result = await controller.uploadStory(mockFile, '20.5', mockUserId);

      expect(service.create).toHaveBeenCalledWith(mockUserId, mockFile, 20.5);
      expect(result).toEqual({ _id: 'story1' });
    });

    it('should use default duration if parsing fails', async () => {
      const mockFile = { buffer: Buffer.from('test') } as any;
      service.create.mockResolvedValue({ _id: 'story1' });

      await controller.uploadStory(mockFile, 'invalid', mockUserId);

      expect(service.create).toHaveBeenCalledWith(mockUserId, mockFile, 15);
    });
  });

  describe('getStories', () => {
    it('should call service.findAllGroupedByUser', async () => {
      service.findAllGroupedByUser.mockResolvedValue([]);
      const result = await controller.getStories(mockUserId);
      expect(service.findAllGroupedByUser).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual([]);
    });
  });
});
