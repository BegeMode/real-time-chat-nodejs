/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable unicorn/no-negated-condition */
/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { PubSubChannels } from '@shared/index.js';
import { RedisService } from '@socket-gateway/redis.service.js';
import { PinoLogger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create mock storage to access instances
const mocks = {
  publisher: null as any,
  subscriber: null as any,
};

// Mock ioredis with a class
vi.mock('ioredis', () => {
  class Redis {
    on = vi.fn();
    subscribe = vi.fn().mockResolvedValue(undefined);
    publish = vi.fn().mockResolvedValue(undefined);
    incr = vi.fn();
    decr = vi.fn();
    sadd = vi.fn().mockResolvedValue(1);
    srem = vi.fn().mockResolvedValue(1);
    sismember = vi.fn().mockResolvedValue(1);
    smembers = vi.fn().mockResolvedValue([]);
    del = vi.fn().mockResolvedValue(1);
    quit = vi.fn().mockResolvedValue(undefined);

    constructor() {
      if (!mocks.publisher) {
        mocks.publisher = this;
      } else {
        mocks.subscriber = this;
      }
    }
  }

  return { Redis };
});

describe('RedisService', () => {
  let service: RedisService;
  let configService: any;
  let logger: any;

  beforeEach(async () => {
    mocks.publisher = null;
    mocks.subscriber = null;
    vi.clearAllMocks();

    configService = {
      get: vi.fn().mockReturnValue('redis://localhost:6379'),
    };
    logger = {
      setContext: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: configService },
        { provide: PinoLogger, useValue: logger },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize redis clients and subscribe to channels', () => {
      expect(configService.get).toHaveBeenCalledWith(
        'REDIS_URL',
        expect.any(String),
      );
      expect(mocks.subscriber.subscribe).toHaveBeenCalled();
      expect(mocks.subscriber.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });
  });

  describe('publish', () => {
    it('should publish message as JSON string', async () => {
      const payload = { test: 'data' };
      await service.publish(PubSubChannels.NEW_MESSAGE, payload as any);

      expect(mocks.publisher.publish).toHaveBeenCalledWith(
        PubSubChannels.NEW_MESSAGE,
        JSON.stringify(payload),
      );
    });
  });

  describe('Message Handlers', () => {
    it('should register and call handlers when message received', () => {
      const handler = vi.fn();
      const payload = { message: 'hello' };

      service.onMessage(PubSubChannels.NEW_MESSAGE, handler);

      // Simulate redis message
      const messageCallback = mocks.subscriber.on.mock.calls.find(
        (call: any) => call[0] === 'message',
      )[1];

      messageCallback(PubSubChannels.NEW_MESSAGE, JSON.stringify(payload));

      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should remove handlers with offMessage', () => {
      const handler = vi.fn();
      service.onMessage(PubSubChannels.NEW_MESSAGE, handler);
      service.offMessage(PubSubChannels.NEW_MESSAGE, handler);

      const messageCallback = mocks.subscriber.on.mock.calls.find(
        (call: any) => call[0] === 'message',
      )[1];

      messageCallback(PubSubChannels.NEW_MESSAGE, JSON.stringify({}));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Presence Logic (setUserOnline / setUserOffline)', () => {
    const userId = 'user123';
    const refCountKey = `presence:refcount:${userId}`;

    it('should return true and add to online set when it is the first connection', async () => {
      mocks.publisher.incr.mockResolvedValue(1);

      const isOnline = await service.setUserOnline(userId);

      expect(isOnline).toBe(true);
      expect(mocks.publisher.incr).toHaveBeenCalledWith(refCountKey);
      expect(mocks.publisher.sadd).toHaveBeenCalledWith(
        'presence:online_users',
        userId,
      );
    });

    it('should return false when it is NOT the first connection', async () => {
      mocks.publisher.incr.mockResolvedValue(2);

      const isOnline = await service.setUserOnline(userId);

      expect(isOnline).toBe(false);
      expect(mocks.publisher.sadd).not.toHaveBeenCalled();
    });

    it('should return true and remove from online set when it is the last connection', async () => {
      mocks.publisher.decr.mockResolvedValue(0);
      mocks.publisher.srem.mockResolvedValue(1);

      const isOffline = await service.setUserOffline(userId);

      expect(isOffline).toBe(true);
      expect(mocks.publisher.decr).toHaveBeenCalledWith(refCountKey);
      expect(mocks.publisher.srem).toHaveBeenCalledWith(
        'presence:online_users',
        userId,
      );
      expect(mocks.publisher.del).toHaveBeenCalledWith(refCountKey);
    });

    it('should return false when it is NOT the last connection', async () => {
      mocks.publisher.decr.mockResolvedValue(1);

      const isOffline = await service.setUserOffline(userId);

      expect(isOffline).toBe(false);
      expect(mocks.publisher.srem).not.toHaveBeenCalled();
    });
  });

  describe('isUserOnline', () => {
    it('should return true if user is in online set', async () => {
      mocks.publisher.sismember.mockResolvedValue(1);
      const isOnline = await service.isUserOnline('u1');
      expect(isOnline).toBe(true);
    });

    it('should return false if user is NOT in online set', async () => {
      mocks.publisher.sismember.mockResolvedValue(0);
      const isOnline = await service.isUserOnline('u1');
      expect(isOnline).toBe(false);
    });
  });
});
