import type { Socket } from 'socket.io';

export interface IAuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
}
