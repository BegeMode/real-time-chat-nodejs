/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChatsService } from '@chats/chats.service.js';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { PubSubChannels } from '@shared/index.js';
import { PubSubService } from '@socket-gateway/interfaces/pub-sub.service.js';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('ChatsService', () => {
  let service: ChatsService;
  let messageModel: any;
  let chatModel: any;
  let pubSubService: any;

  const mockUserId = new Types.ObjectId().toString();
  const mockChatId = new Types.ObjectId().toString();
  const mockOtherUserId = new Types.ObjectId().toString();

  beforeEach(async () => {
    messageModel = {
      create: vi.fn(),
      findById: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      countDocuments: vi.fn(),
      updateOne: vi.fn(),
      findByIdAndDelete: vi.fn(),
    };

    chatModel = {
      create: vi.fn(),
      findById: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      updateOne: vi.fn(),
      findByIdAndUpdate: vi.fn(),
    };

    pubSubService = {
      publish: vi.fn(),
      getOnlineUserIds: vi.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatsService,
        { provide: getModelToken('Message'), useValue: messageModel },
        { provide: getModelToken('Chat'), useValue: chatModel },
        { provide: PubSubService, useValue: pubSubService },
      ],
    }).compile();

    service = module.get<ChatsService>(ChatsService);

    // Suppress logs
    vi.spyOn((service as any).logger, 'log').mockImplementation(
      () => undefined,
    );
    vi.spyOn((service as any).logger, 'error').mockImplementation(
      () => undefined,
    );
    vi.spyOn((service as any).logger, 'debug').mockImplementation(
      () => undefined,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMessage', () => {
    const createMessageDto = {
      chatId: mockChatId,
      text: 'Hello world',
    };

    it('should throw NotFoundException if chat does not exist', async () => {
      chatModel.findById.mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.createMessage(mockUserId, createMessageDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not a participant', async () => {
      chatModel.findById.mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue({
            _id: mockChatId,
            members: [{ user: new Types.ObjectId().toString() }],
          }),
        }),
      });

      await expect(
        service.createMessage(mockUserId, createMessageDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create a message and publish to PubSub', async () => {
      const mockChat = {
        _id: mockChatId,
        members: [{ user: mockUserId }, { user: mockOtherUserId }],
      };

      const mockMessage = {
        _id: new Types.ObjectId().toString(),
        chatId: new Types.ObjectId(mockChatId),
        senderId: new Types.ObjectId(mockUserId),
        text: 'Hello world',
        createdAt: new Date(),
      };

      chatModel.findById.mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockChat),
        }),
      });

      messageModel.create.mockResolvedValue(mockMessage);

      chatModel.findByIdAndUpdate.mockResolvedValue({});

      messageModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue({
          ...mockMessage,
          senderId: { _id: mockUserId, username: 'testuser' },
        }),
      });

      const result = await service.createMessage(mockUserId, createMessageDto);

      expect(result).toBeDefined();
      expect(messageModel.create).toHaveBeenCalled();
      expect(pubSubService.publish).toHaveBeenCalledWith(
        PubSubChannels.NEW_MESSAGE,
        expect.objectContaining({
          chatId: mockChatId,
          text: 'Hello world',
          senderId: mockUserId,
        }),
      );
    });
  });

  describe('getMessages', () => {
    it('should throw NotFoundException if chat not found', async () => {
      chatModel.findById.mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.getMessages(mockUserId, mockChatId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return paginated messages', async () => {
      const mockChat = {
        _id: mockChatId,
        members: [{ user: mockUserId }],
      };

      chatModel.findById.mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockChat),
        }),
      });

      messageModel.countDocuments.mockResolvedValue(10);
      messageModel.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId().toString(),
            text: 'hi',
            createdAt: new Date(),
          },
        ]),
      });

      const result = await service.getMessages(mockUserId, mockChatId, {
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(10);
    });
  });

  describe('getOrCreateChat', () => {
    it('should throw BadRequestException if less than 2 participants', async () => {
      await expect(service.getOrCreateChat(mockUserId, [])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return existing chat if found', async () => {
      const mockChat = {
        _id: mockChatId,
        members: [
          { user: { _id: mockUserId, username: 'u1' } },
          { user: { _id: mockOtherUserId, username: 'u2' } },
        ],
      };

      chatModel.findOne.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockChat),
      });

      const result = await service.getOrCreateChat(mockUserId, [
        mockOtherUserId,
      ]);

      expect(result).toEqual(mockChat);
      expect(chatModel.create).not.toHaveBeenCalled();
    });

    it('should create new chat if not exists', async () => {
      chatModel.findOne.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(null),
      });

      const newChat = { _id: mockChatId };
      chatModel.create.mockResolvedValue(newChat);

      const populatedChat = {
        _id: mockChatId,
        members: [
          { user: { _id: mockUserId } },
          { user: { _id: mockOtherUserId } },
        ],
      };

      chatModel.findById.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(populatedChat),
      });

      const result = await service.getOrCreateChat(mockUserId, [
        mockOtherUserId,
      ]);

      expect(result).toBeDefined();
      expect(chatModel.create).toHaveBeenCalled();
      expect(pubSubService.publish).toHaveBeenCalledWith(
        PubSubChannels.CHAT_CREATED,
        expect.any(Object),
      );
    });
  });

  describe('deleteMessage', () => {
    it('should throw NotFoundException if message not found', async () => {
      const msgId = new Types.ObjectId().toString();
      messageModel.findById.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(
        service.deleteMessage(mockUserId, msgId, true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete for everyone if user is sender', async () => {
      const msgId = new Types.ObjectId().toString();
      const mockMessage = {
        _id: msgId,
        senderId: new Types.ObjectId(mockUserId),
        chatId: new Types.ObjectId(mockChatId),
      };

      messageModel.findById.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockMessage),
      });

      chatModel.findById.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue({
          _id: mockChatId,
          members: [{ user: mockUserId }],
        }),
      });

      await service.deleteMessage(mockUserId, msgId, true);

      expect(messageModel.findByIdAndDelete).toHaveBeenCalledWith(msgId);
      expect(pubSubService.publish).toHaveBeenCalledWith(
        PubSubChannels.MESSAGE_DELETED,
        expect.objectContaining({ forEveryone: true }),
      );
    });

    it('should throw ForbiddenException if deleting for everyone and not sender', async () => {
      const msgId = new Types.ObjectId().toString();
      const mockMessage = {
        _id: msgId,
        senderId: new Types.ObjectId(mockOtherUserId),
        chatId: new Types.ObjectId(mockChatId),
      };

      messageModel.findById.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockMessage),
      });

      await expect(
        service.deleteMessage(mockUserId, msgId, true),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should soft delete for self', async () => {
      const msgId = new Types.ObjectId().toString();
      const mockMessage = {
        _id: msgId,
        senderId: new Types.ObjectId(mockOtherUserId),
        chatId: new Types.ObjectId(mockChatId),
      };

      messageModel.findById.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockMessage),
      });

      messageModel.updateOne.mockResolvedValue({ matchedCount: 1 });

      await service.deleteMessage(mockUserId, msgId, false);

      expect(messageModel.updateOne).toHaveBeenCalled();
      expect(pubSubService.publish).toHaveBeenCalledWith(
        PubSubChannels.MESSAGE_DELETED,
        expect.objectContaining({ forEveryone: false }),
      );
    });
  });

  describe('getChatPartnerIds', () => {
    it('should return unique partner IDs', async () => {
      const mockChats = [
        {
          members: [
            { user: new Types.ObjectId(mockUserId), deletedAt: null },
            { user: new Types.ObjectId(mockOtherUserId), deletedAt: null },
          ],
        },
      ];

      chatModel.find.mockReturnValue({
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockChats),
      });

      const result = await service.getChatPartnerIds(mockUserId);

      expect(result).toEqual([mockOtherUserId]);
    });
  });
});
