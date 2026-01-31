import type { PubSubChannels } from '@shared/index.js';

export abstract class PubSubService {
  abstract publish(channel: PubSubChannels, payload: unknown): Promise<void>;
  abstract onMessage(
    channel: PubSubChannels,
    handler: (payload: unknown) => void,
  ): void;
  abstract offMessage(
    channel: PubSubChannels,
    handler: (payload: unknown) => void,
  ): void;
}
