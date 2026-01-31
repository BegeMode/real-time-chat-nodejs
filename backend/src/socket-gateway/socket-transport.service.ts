import type { SocketEvents } from '@shared/index.js';

export abstract class SocketTransport {
  /**
   * Send a message to a specific channel (formerly room)
   */
  abstract emitToChannel(
    channel: string,
    event: SocketEvents,
    payload: unknown,
  ): void;

  /**
   * Send a message to a specific user on all their devices/sockets
   */
  abstract emitToUser(
    userId: string,
    event: SocketEvents,
    payload: unknown,
  ): void;

  /**
   * Subscribe a client to a channel
   */
  abstract joinChannel(client: unknown, channel: string): void;

  /**
   * Unsubscribe a client from a channel
   */
  abstract leaveChannel(client: unknown, channel: string): void;

  /**
   * Check if a user is in a channel
   */
  abstract isUserInChannel(userId: string, channel: string): boolean;

  /**
   * Get a list of all connected user IDs
   */
  abstract getConnectedUserIds(): string[];

  /**
   * Broadcast a message to all connected users
   */
  abstract broadcast(event: SocketEvents, payload: unknown): void;
}
