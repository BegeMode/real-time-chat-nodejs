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
import { PubSubService } from '@socket-gateway/interfaces/pub-sub.service.js';
import { Redis } from 'ioredis';
import { PinoLogger } from 'nestjs-pino';

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
    let count = await this.publisher.incr(key);

    // Always update timestamp in ZSET
    const now = Date.now();
    // zadd returns 1 if the member was newly added, 0 if it already existed
    const added = await this.publisher.zadd(ONLINE_USERS_KEY, now, userId);

    // Robustness: if user was NOT in ZSET but count > 1, the counter is stale.
    // This happens if the server crashed and missed some disconnect events.
    if (added === 1 && count > 1) {
      this.logger.warn(
        `Stale counter detected for user ${userId} (count=${count.toString()}). Resetting to 1.`,
      );
      await this.publisher.set(key, 1);
      count = 1;
    }

    return count === 1;
  }

  async setUserOffline(userId: string): Promise<boolean> {
    const key = `${USER_REFCOUNT_PREFIX}${userId}`;
    const count = await this.publisher.decr(key);

    if (count <= 0) {
      await this.publisher.del(key);
      await this.publisher.zrem(ONLINE_USERS_KEY, userId);

      return true;
    }

    return false;
  }

  async refreshUsersStatus(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    const now = Date.now();
    const args: (string | number)[] = [];

    for (const id of userIds) {
      args.push(now, id);
    }

    await this.publisher.zadd(ONLINE_USERS_KEY, ...args);
  }

  async getOnlineUserIds(): Promise<string[]> {
    const twoMinutesAgo = Date.now() - 120_000;

    // Optional: Clean up truly stale users
    await this.publisher.zremrangebyscore(
      ONLINE_USERS_KEY,
      '-inf',
      twoMinutesAgo,
    );

    return this.publisher.zrange(ONLINE_USERS_KEY, 0, -1);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const score = await this.publisher.zscore(ONLINE_USERS_KEY, userId);
    if (!score) return false;

    const twoMinutesAgo = Date.now() - 120_000;

    return Number.parseInt(score, 10) > twoMinutesAgo;
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
