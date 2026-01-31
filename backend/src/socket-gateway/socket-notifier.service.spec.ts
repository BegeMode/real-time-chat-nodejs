/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type {
  PubSubNewMessagePayload,
  PubSubUserStatusPayload,
  PubSubUserTypingPayload,
} from '@shared/index.js';
import { PubSubChannels, SocketEvents } from '@shared/index.js';
import { PubSubService } from '@socket-gateway/pub-sub.service.js';
import { SocketNotifierService } from '@socket-gateway/socket-notifier.service.js';
import { SocketTransport } from '@socket-gateway/socket-transport.service.js';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';

describe('SocketNotifierService', () => {
  let service: SocketNotifierService;
  let pubSubService: Mocked<PubSubService>;
  let transport: Mocked<SocketTransport>;
  const handlers: Record<string, (payload: unknown) => void> = {};

  beforeEach(async () => {
    pubSubService = {
      onMessage: vi.fn().mockImplementation((channel, handler) => {
        handlers[channel] = handler;
      }),
      publish: vi.fn(),
      offMessage: vi.fn(),
    } as any;

    transport = {
      emitToUsers: vi.fn(),
      emitToUser: vi.fn(),
      isUserOnline: vi.fn(),
      broadcast: vi.fn(),
      getConnectedUserIds: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketNotifierService,
        { provide: PubSubService, useValue: pubSubService },
        { provide: SocketTransport, useValue: transport },
      ],
    }).compile();

    service = module.get<SocketNotifierService>(SocketNotifierService);
    service.onModuleInit();
  });

  describe('NEW_MESSAGE handling', () => {
    it('should emit to all receivers via personal channels', () => {
      const payload: PubSubNewMessagePayload = {
        chatId: 'chat123',
        messageId: 'msg456',
        senderId: 'user1',
        receiverIds: ['user1', 'user2', 'user3'],
        text: 'Hello world',
        createdAt: new Date().toISOString(),
      };

      handlers[PubSubChannels.NEW_MESSAGE](payload);

      expect(transport.emitToUsers).toHaveBeenCalledWith(
        ['user1', 'user2', 'user3'],
        SocketEvents.NEW_MESSAGE,
        expect.objectContaining({ _id: 'msg456', text: 'Hello world' }),
      );
    });
  });

  describe('USER_TYPING handling', () => {
    it('should emit typing status to all participants', () => {
      const payload: PubSubUserTypingPayload = {
        userId: 'user1',
        chatId: 'chat123',
        isTyping: true,
        receiverIds: ['user1', 'user2'],
      };

      handlers[PubSubChannels.USER_TYPING](payload);

      expect(transport.emitToUsers).toHaveBeenCalledWith(
        ['user1', 'user2'],
        SocketEvents.TYPING_START,
        { userId: 'user1', chatId: 'chat123' },
      );
    });

    it('should emit typing stop to all participants', () => {
      const payload: PubSubUserTypingPayload = {
        userId: 'user1',
        chatId: 'chat123',
        isTyping: false,
        receiverIds: ['user1', 'user2'],
      };

      handlers[PubSubChannels.USER_TYPING](payload);

      expect(transport.emitToUsers).toHaveBeenCalledWith(
        ['user1', 'user2'],
        SocketEvents.TYPING_STOP,
        { userId: 'user1', chatId: 'chat123' },
      );
    });
  });

  describe('USER_STATUS handling', () => {
    it('should broadcast USER_ONLINE status', () => {
      const payload: PubSubUserStatusPayload = {
        userId: 'user1',
        isOnline: true,
      };

      handlers[PubSubChannels.USER_STATUS](payload);

      expect(transport.broadcast).toHaveBeenCalledWith(
        SocketEvents.USER_ONLINE,
        { userId: 'user1' },
      );
    });
  });

  describe('MESSAGE_DELETED handling', () => {
    it('should emit deletion to all receivers', () => {
      const payload = {
        messageId: 'msg123',
        chatId: 'chat456',
        receiverIds: ['u1', 'u2'],
        forEveryone: true,
      };

      handlers[PubSubChannels.MESSAGE_DELETED](payload);

      expect(transport.emitToUsers).toHaveBeenCalledWith(
        ['u1', 'u2'],
        SocketEvents.MESSAGE_DELETED,
        expect.objectContaining({ messageId: 'msg123' }),
      );
    });
  });
});
