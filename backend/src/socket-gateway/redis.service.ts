import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PubSubChannels,
  PubSubChatDeletedPayload,
  PubSubMessageDeletedPayload,
  PubSubNewMessagePayload,
  PubSubUserStatusPayload,
  PubSubUserTypingPayload,
} from '@shared/index.js';
import { Redis } from 'ioredis';
import { PinoLogger } from 'nestjs-pino';

import { PubSubService } from './pub-sub.service.js';

type RedisPayload =
  | PubSubNewMessagePayload
  | PubSubUserStatusPayload
  | PubSubUserTypingPayload
  | PubSubMessageDeletedPayload
  | PubSubChatDeletedPayload;

const ONLINE_USERS_KEY = 'presence:online_users';
const USER_REFCOUNT_PREFIX = 'presence:refcount:';

@Injectable()
export class RedisService
  extends PubSubService
  implements OnModuleInit, OnModuleDestroy
{
  private publisher!: Redis;
  private subscriber!: Redis;
  private messageHandlers = new Map<string, Set<(payload: unknown) => void>>();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    super();
    this.logger.setContext(RedisService.name);
  }

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>(
      'REDIS_URL',
      'redis://localhost:6379',
    );

    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);

    this.publisher.on('connect', () => {
      this.logger.info('Redis publisher connected');
    });

    this.subscriber.on('connect', () => {
      this.logger.info('Redis subscriber connected');
    });

    this.publisher.on('error', (error: Error) => {
      this.logger.error(`Redis publisher error: ${error.message}`);
    });

    this.subscriber.on('error', (error: Error) => {
      this.logger.error(`Redis subscriber error: ${error.message}`);
    });

    // Subscribe to all channels
    await this.subscribeToChannels();
  }

  async onModuleDestroy(): Promise<void> {
    await this.publisher.quit();
    await this.subscriber.quit();
  }

  private async subscribeToChannels(): Promise<void> {
    const channels = Object.values(PubSubChannels);

    await this.subscriber.subscribe(...channels);

    this.subscriber.on('message', (channel: string, message: string) => {
      this.logger.debug(`Received message on channel ${channel}`);

      try {
        const payload = JSON.parse(message) as unknown;
        const handlers = this.messageHandlers.get(channel);

        if (handlers) {
          for (const handler of handlers) {
            handler(payload);
          }
        }
      } catch (error: unknown) {
        this.logger.error(
          `Error parsing message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    });
  }

  /**
   * Publish a message to a Redis channel
   */
  async publish(channel: PubSubChannels, payload: RedisPayload): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(payload));
    this.logger.debug(`Published message to channel ${channel}`);
  }

  /**
   * Register a handler for a specific Redis channel
   */
  onMessage(
    channel: PubSubChannels,
    handler: (payload: unknown) => void,
  ): void {
    if (!this.messageHandlers.has(channel)) {
      this.messageHandlers.set(channel, new Set());
    }

    this.messageHandlers
      .get(channel)
      ?.add(handler as (payload: unknown) => void);
  }

  /**
   * Remove a handler for a specific Redis channel
   */
  offMessage(
    channel: PubSubChannels,
    handler: (payload: unknown) => void,
  ): void {
    this.messageHandlers
      .get(channel)
      ?.delete(handler as (payload: unknown) => void);
  }

  /**
   * Presence Tracking (Global Reference Counting)
   */
  async setUserOnline(userId: string): Promise<boolean> {
    const key = `${USER_REFCOUNT_PREFIX}${userId}`;
    const count = await this.publisher.incr(key);

    if (count === 1) {
      await this.publisher.sadd(ONLINE_USERS_KEY, userId);

      return true;
    }

    return false;
  }

  async setUserOffline(userId: string): Promise<boolean> {
    const key = `${USER_REFCOUNT_PREFIX}${userId}`;
    const count = await this.publisher.decr(key);

    if (count <= 0) {
      // Cleanup to prevent negative counts or orphans
      await this.publisher.del(key);
      const wasRemoved = await this.publisher.srem(ONLINE_USERS_KEY, userId);

      return wasRemoved === 1;
    }

    return false;
  }

  async getOnlineUserIds(): Promise<string[]> {
    return this.publisher.smembers(ONLINE_USERS_KEY);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const result = await this.publisher.sismember(ONLINE_USERS_KEY, userId);

    return result === 1;
  }

  /**
   * Get publisher instance for Redis Adapter
   */
  getPublisher(): Redis {
    return this.publisher;
  }

  /**
   * Get subscriber instance for Redis Adapter
   */
  getSubscriber(): Redis {
    return this.subscriber;
  }
}
