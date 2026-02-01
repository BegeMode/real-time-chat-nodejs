import { io, Socket } from 'socket.io-client';
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { SocketEvents, type IMessage, type IUser } from '@shared/index';
import { authStore } from './auth';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface SocketState {
	isConnected: boolean;
	error: string | null;
}

function createSocketStore() {
	const { subscribe, set, update } = writable<SocketState>({
		isConnected: false,
		error: null
	});

	let socket: Socket | null = null;

	return {
		subscribe,

		/**
		 * Initialize socket connection
		 */
		connect() {
			if (!browser || socket?.connected) return;

			const token = authStore.getAccessToken();
			if (!token) return;

			console.log('🔌 Connecting to socket...');

			socket = io(SOCKET_URL, {
				auth: { token },
				transports: ['websocket'],
				reconnectionAttempts: 5,
				reconnectionDelay: 1000
			});

			socket.on(SocketEvents.CONNECT, () => {
				console.log('✅ Socket connected');
				update((s) => ({ ...s, isConnected: true, error: null }));
			});

			socket.on(SocketEvents.DISCONNECT, (reason) => {
				console.log('❌ Socket disconnected:', reason);
				update((s) => ({ ...s, isConnected: false }));
			});

			socket.on(SocketEvents.CONNECT_ERROR, (error) => {
				console.error('⚠️ Socket connection error:', error);
				update((s) => ({ ...s, error: error.message, isConnected: false }));
			});

			socket.on(SocketEvents.UNAUTHORIZED, (payload) => {
				console.error('🚫 Socket unauthorized:', payload);
				// Potentially trigger token refresh or logout
				update((s) => ({ ...s, error: 'Unauthorized', isConnected: false }));
			});

			// Message listeners
			socket.on(SocketEvents.NEW_MESSAGE, async (payload: IMessage<IUser>) => {
				console.log('📩 New message received:', payload);
				const { messagesStore } = await import('./messages');
				messagesStore.addMessage(payload.chatId, payload);
			});

			socket.on(SocketEvents.MESSAGE_ERROR, (payload: { message: string }) => {
				console.error('⚠️ Message error:', payload);
				update((s) => ({ ...s, error: payload.message }));
			});

			// User status listeners
			socket.on(SocketEvents.USER_ONLINE, async (payload: { userId: string }) => {
				const { chatsStore } = await import('./chats');
				chatsStore.setUserStatus(payload.userId, true);
			});

			socket.on(SocketEvents.USER_OFFLINE, async (payload: { userId: string }) => {
				const { chatsStore } = await import('./chats');
				chatsStore.setUserStatus(payload.userId, false);
			});

			// Typing listeners
			socket.on(SocketEvents.TYPING_START, async (payload: { chatId: string; userId: string }) => {
				const { chatsStore } = await import('./chats');
				chatsStore.setTyping(payload.chatId, payload.userId, true);
			});

			socket.on(SocketEvents.TYPING_STOP, async (payload: { chatId: string; userId: string }) => {
				const { chatsStore } = await import('./chats');
				chatsStore.setTyping(payload.chatId, payload.userId, false);
			});

			return socket;
		},

		/**
		 * Disconnect socket
		 */
		disconnect() {
			if (socket) {
				console.log('🔌 Disconnecting socket...');
				socket.disconnect();
				socket = null;
				set({ isConnected: false, error: null });
			}
		},

		/**
		 * Get the socket instance
		 */
		getSocket(): Socket | null {
			return socket;
		},

		/**
		 * Type-safe emit helper
		 */
		emit(event: SocketEvents, payload: unknown) {
			if (socket?.connected) {
				socket.emit(event, payload);
			} else {
				console.warn(`⚠️ Cannot emit ${event}: socket not connected`);
			}
		},

		/**
		 * Type-safe on helper
		 */
		on(event: SocketEvents, callback: (payload: unknown) => void) {
			if (socket) {
				socket.on(event, callback);
			}
		}
	};
}

export const socketStore = createSocketStore();
