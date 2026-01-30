import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RedisChannels,
  RedisNewMessagePayload,
  RedisUserStatusPayload,
  RedisUserTypingPayload,
} from '@shared/index.js';
import { Redis } from 'ioredis';
import { PinoLogger } from 'nestjs-pino';

type RedisPayload =
  | RedisNewMessagePayload
  | RedisUserStatusPayload
  | RedisUserTypingPayload;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private publisher!: Redis;
  private subscriber!: Redis;
  private messageHandlers = new Map<string, Set<(payload: unknown) => void>>();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
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
    const channels = Object.values(RedisChannels);

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
  async publish(channel: RedisChannels, payload: RedisPayload): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(payload));
    this.logger.debug(`Published message to channel ${channel}`);
  }

  /**
   * Register a handler for a specific Redis channel
   */
  onMessage(channel: RedisChannels, handler: (payload: unknown) => void): void {
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
    channel: RedisChannels,
    handler: (payload: unknown) => void,
  ): void {
    this.messageHandlers
      .get(channel)
      ?.delete(handler as (payload: unknown) => void);
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
