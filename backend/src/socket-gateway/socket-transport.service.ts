import type { SocketEvents } from '@shared/index.js';

export abstract class SocketTransport {
  /**
   * Send a message to specific users on all their devices/sockets
   */
  abstract emitToUsers(
    userIds: string[],
    event: SocketEvents,
    payload: unknown,
  ): void;

  /**
   * Send a message to a single user on all their devices/sockets
   */
  abstract emitToUser(
    userId: string,
    event: SocketEvents,
    payload: unknown,
  ): void;

  /**
   * Get a list of all currently connected user IDs
   */
  abstract getConnectedUserIds(): string[];

  /**
   * Check if a specific user is currently online
   */
  abstract isUserOnline(userId: string): boolean;

  /**
   * Broadcast a message to ALL connected users
   */
  abstract broadcast(event: SocketEvents, payload: unknown): void;
}
