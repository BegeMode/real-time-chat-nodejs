/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChatsController } from '@chats/chats.controller.js';
import { ChatsService } from '@chats/chats.service.js';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('ChatsController', () => {
  let controller: ChatsController;
  let service: any;

  const mockUserId = new Types.ObjectId().toString();
  const mockChatId = new Types.ObjectId().toString();

  beforeEach(async () => {
    service = {
      getChats: vi.fn(),
      getOrCreateChat: vi.fn(),
      deleteChat: vi.fn(),
      createMessage: vi.fn(),
      getMessages: vi.fn(),
      deleteMessage: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatsController],
      providers: [{ provide: ChatsService, useValue: service }],
    }).compile();

    controller = module.get<ChatsController>(ChatsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getChats', () => {
    it('should call service.getChats', async () => {
      service.getChats.mockResolvedValue([]);
      const result = await controller.getChats(mockUserId);
      expect(service.getChats).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual([]);
    });
  });

  describe('getOrCreateChat', () => {
    it('should call service.getOrCreateChat', async () => {
      const dto = { userIds: ['user2'] };
      service.getOrCreateChat.mockResolvedValue({ _id: mockChatId });
      const result = await controller.getOrCreateChat(dto, mockUserId);
      expect(service.getOrCreateChat).toHaveBeenCalledWith(
        mockUserId,
        dto.userIds,
      );
      expect(result).toEqual({ _id: mockChatId });
    });
  });

  describe('deleteChat', () => {
    it('should call service.deleteChat', async () => {
      await controller.deleteChat(mockChatId, mockUserId);
      expect(service.deleteChat).toHaveBeenCalledWith(mockUserId, mockChatId);
    });
  });

  describe('createMessage', () => {
    it('should call service.createMessage', async () => {
      const dto = { chatId: mockChatId, text: 'hi' };
      service.createMessage.mockResolvedValue({ _id: 'msg1' });
      const result = await controller.createMessage(dto, mockUserId);
      expect(service.createMessage).toHaveBeenCalledWith(mockUserId, dto);
      expect(result).toEqual({ _id: 'msg1' });
    });
  });

  describe('getMessages', () => {
    it('should call service.getMessages', async () => {
      const query = { limit: 10 };
      service.getMessages.mockResolvedValue({ items: [] });
      const result = await controller.getMessages(
        mockChatId,
        query,
        mockUserId,
      );
      expect(service.getMessages).toHaveBeenCalledWith(
        mockUserId,
        mockChatId,
        query,
      );
      expect(result).toEqual({ items: [] });
    });
  });

  describe('deleteMessage', () => {
    it('should call service.deleteMessage with correct forEveryone boolean', async () => {
      const msgId = new Types.ObjectId().toString();
      await controller.deleteMessage(msgId, 'true', mockUserId);
      expect(service.deleteMessage).toHaveBeenCalledWith(
        mockUserId,
        msgId,
        true,
      );

      await controller.deleteMessage(msgId, 'false', mockUserId);
      expect(service.deleteMessage).toHaveBeenCalledWith(
        mockUserId,
        msgId,
        false,
      );
    });
  });
});
