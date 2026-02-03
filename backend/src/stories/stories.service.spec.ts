/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';

import { ChatsService } from '@chats/chats.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { PubSubChannels } from '@shared/index.js';
import { PubSubService } from '@socket-gateway/interfaces/pub-sub.service.js';
import { Story } from '@stories/models/story.js';
import { StoriesService } from '@stories/stories.service.js';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs');
vi.mock('node:fs/promises');

describe('StoriesService', () => {
  let service: StoriesService;
  let storyModel: any;
  let chatsService: any;
  let pubSubService: any;

  const mockUserId = new Types.ObjectId().toString();
  const mockPartnerId = new Types.ObjectId().toString();

  beforeEach(async () => {
    // Mock constructor using a regular function
    const mockStory = vi.fn().mockImplementation(function (
      this: any,
      dto: any,
    ) {
      this.save = vi
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId().toString(), ...dto });
      Object.assign(this, dto);
    });

    storyModel = mockStory;
    // Add static methods to mock constructor
    storyModel.findById = vi.fn();
    storyModel.find = vi.fn();

    chatsService = {
      getChatPartnerIds: vi.fn().mockResolvedValue([]),
    };

    pubSubService = {
      publish: vi.fn(),
    };

    (fs.existsSync as any).mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoriesService,
        { provide: getModelToken(Story.name), useValue: storyModel },
        { provide: ChatsService, useValue: chatsService },
        { provide: PubSubService, useValue: pubSubService },
      ],
    }).compile();

    service = module.get<StoriesService>(StoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a story, save file and publish to PubSub', async () => {
      const mockFile = {
        originalname: 'test.mp4',
        buffer: Buffer.from('test'),
      } as any;

      const mockStoryId = new Types.ObjectId().toString();
      const mockResult = {
        _id: mockStoryId,
        user: { _id: mockUserId, username: 'testuser' },
        videoUrl: '/uploads/stories/test.mp4',
        duration: 10,
      };

      storyModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockResult),
      });

      chatsService.getChatPartnerIds.mockResolvedValue([mockPartnerId]);

      const result = await service.create(mockUserId, mockFile, 10);

      expect(fsPromises.writeFile).toHaveBeenCalled();
      expect(storyModel.findById).toHaveBeenCalled();
      expect(pubSubService.publish).toHaveBeenCalledWith(
        PubSubChannels.NEW_STORY,
        expect.objectContaining({
          userId: mockUserId,
          receiverIds: [mockPartnerId],
        }),
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('findAllGroupedByUser', () => {
    it('should return stories grouped by user', async () => {
      const mockStories = [
        {
          _id: new Types.ObjectId().toString(),
          user: { _id: mockUserId, username: 'testuser' },
          videoUrl: 'url1',
          createdAt: new Date(),
        },
        {
          _id: new Types.ObjectId().toString(),
          user: { _id: mockPartnerId, username: 'otheruser' },
          videoUrl: 'url2',
          createdAt: new Date(),
        },
      ];

      storyModel.find.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockStories),
      });

      chatsService.getChatPartnerIds.mockResolvedValue([mockPartnerId]);

      const result = await service.findAllGroupedByUser(mockUserId);

      expect(result).toHaveLength(2);
      expect(result.find((g) => g.user._id === mockUserId)).toBeDefined();
      expect(result.find((g) => g.user._id === mockPartnerId)).toBeDefined();
    });
  });
});
