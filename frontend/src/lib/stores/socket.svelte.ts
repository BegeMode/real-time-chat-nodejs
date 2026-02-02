import { io, Socket } from 'socket.io-client';
import { browser } from '$app/environment';
import { SocketEvents, type IMessage, type IUser, type IChat } from '@shared/index';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

/**
 * Socket Store using Svelte 5 Runes with class-based architecture
 */
class SocketStore {
	// Reactive state using $state rune
	isConnected = $state(false);
	error = $state<string | null>(null);

	// Private socket instance (not reactive)
	private socket: Socket | null = null;

	/**
	 * Initialize socket connection
	 */
	async connect() {
		if (!browser || this.socket?.connected) return;

		// Dynamic import to avoid circular dependencies
		const { authStore } = await import('./auth.svelte');
		const token = authStore.getAccessToken();
		if (!token) return;

		console.log('Connecting to socket...');

		this.socket = io(SOCKET_URL, {
			auth: { token },
			transports: ['websocket'],
			reconnectionAttempts: 5,
			reconnectionDelay: 1000
		});

		this.socket.on(SocketEvents.CONNECT, () => {
			console.log('Socket connected');
			this.isConnected = true;
			this.error = null;
		});

		this.socket.on(SocketEvents.DISCONNECT, (reason) => {
			console.log('Socket disconnected:', reason);
			this.isConnected = false;
		});

		this.socket.on(SocketEvents.CONNECT_ERROR, (error) => {
			console.error('Socket connection error:', error);
			this.error = error.message;
			this.isConnected = false;
		});

		this.socket.on(SocketEvents.UNAUTHORIZED, (payload) => {
			console.error('Socket unauthorized:', payload);
			this.error = 'Unauthorized';
			this.isConnected = false;
		});

		// Message listeners
		this.socket.on(SocketEvents.NEW_MESSAGE, async (payload: IMessage<IUser>) => {
			console.log('New message received:', payload);
			const { messagesStore } = await import('./messages.svelte');
			messagesStore.addMessage(payload.chatId, payload);
		});

		this.socket.on(SocketEvents.NEW_CHAT, async (payload: IChat<IUser>) => {
			console.log('New chat received:', payload);
			const { chatsStore } = await import('./chats.svelte');
			const { storiesStore } = await import('./stories.svelte');
			chatsStore.addChat(payload);
			storiesStore.fetchStories();
		});

		this.socket.on(SocketEvents.MESSAGE_ERROR, (payload: { message: string }) => {
			console.error('Message error:', payload);
			this.error = payload.message;
		});

		// User status listeners
		this.socket.on(SocketEvents.USER_ONLINE, async (payload: { userId: string }) => {
			const { chatsStore } = await import('./chats.svelte');
			chatsStore.setUserStatus(payload.userId, true);
		});

		this.socket.on(SocketEvents.USER_OFFLINE, async (payload: { userId: string }) => {
			const { chatsStore } = await import('./chats.svelte');
			chatsStore.setUserStatus(payload.userId, false);
		});

		// Typing listeners
		this.socket.on(
			SocketEvents.TYPING_START,
			async (payload: { chatId: string; userId: string }) => {
				const { chatsStore } = await import('./chats.svelte');
				chatsStore.setTyping(payload.chatId, payload.userId, true);
			}
		);

		this.socket.on(
			SocketEvents.TYPING_STOP,
			async (payload: { chatId: string; userId: string }) => {
				const { chatsStore } = await import('./chats.svelte');
				chatsStore.setTyping(payload.chatId, payload.userId, false);
			}
		);

		// Story listeners
		this.socket.on(SocketEvents.NEW_STORY, async (payload: { story: any }) => {
			console.log('New story received:', payload);
			const { storiesStore } = await import('./stories.svelte');
			storiesStore.addStory(payload.story);
		});

		return this.socket;
	}

	/**
	 * Disconnect socket
	 */
	disconnect() {
		if (this.socket) {
			console.log('Disconnecting socket...');
			this.socket.disconnect();
			this.socket = null;
			this.isConnected = false;
			this.error = null;
		}
	}

	/**
	 * Get the socket instance
	 */
	getSocket(): Socket | null {
		return this.socket;
	}

	/**
	 * Type-safe emit helper
	 */
	emit(event: SocketEvents, payload: unknown) {
		if (this.socket?.connected) {
			this.socket.emit(event, payload);
		} else {
			console.warn(`Cannot emit ${event}: socket not connected`);
		}
	}

	/**
	 * Type-safe on helper
	 */
	on(event: SocketEvents, callback: (payload: unknown) => void) {
		if (this.socket) {
			this.socket.on(event, callback);
		}
	}
}

// Export singleton instance
export const socketStore = new SocketStore();
