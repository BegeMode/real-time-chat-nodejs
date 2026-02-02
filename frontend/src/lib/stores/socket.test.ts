import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocketEvents } from '@shared/index';

// Mock socket.io-client
const mockSocket = {
	on: vi.fn(),
	emit: vi.fn(),
	disconnect: vi.fn(),
	connected: false
};
vi.mock('socket.io-client', () => ({
	io: vi.fn(() => mockSocket)
}));

// Mock app environment
vi.mock('$app/environment', () => ({
	browser: true
}));

// Mock other stores
vi.mock('./auth.svelte', () => ({
	authStore: {
		getAccessToken: vi.fn(() => 'fake-token')
	}
}));

vi.mock('./messages.svelte', () => ({
	messagesStore: {
		addMessage: vi.fn()
	}
}));

vi.mock('./chats.svelte', () => ({
	chatsStore: {
		setUserStatus: vi.fn(),
		setTyping: vi.fn()
	}
}));

// Now import the store
import { socketStore } from './socket.svelte';
import { io } from 'socket.io-client';

describe('SocketStore', () => {
	beforeEach(() => {
		socketStore.disconnect();
		vi.clearAllMocks();
		mockSocket.connected = false;
	});

	it('should initialize with disconnected state', () => {
		expect(socketStore.isConnected).toBe(false);
		expect(socketStore.getSocket()).toBeNull();
	});

	it('should connect when browser is true and token exists', async () => {
		await socketStore.connect();

		expect(io).toHaveBeenCalled();
		expect(socketStore.getSocket()).toBe(mockSocket);
	});

	it('should handle connect event', async () => {
		await socketStore.connect();

		// Find the connect callback
		const connectCallback = vi
			.mocked(mockSocket.on)
			.mock.calls.find((call) => call[0] === SocketEvents.CONNECT)?.[1];
		expect(connectCallback).toBeDefined();

		if (connectCallback) {
			connectCallback();
			expect(socketStore.isConnected).toBe(true);
			expect(socketStore.error).toBeNull();
		}
	});

	it('should handle disconnect event', async () => {
		await socketStore.connect();

		const disconnectCallback = vi
			.mocked(mockSocket.on)
			.mock.calls.find((call) => call[0] === SocketEvents.DISCONNECT)?.[1];

		if (disconnectCallback) {
			disconnectCallback('transport close');
			expect(socketStore.isConnected).toBe(false);
		}
	});

	it('should handle connect error', async () => {
		await socketStore.connect();

		const errorCallback = vi
			.mocked(mockSocket.on)
			.mock.calls.find((call) => call[0] === SocketEvents.CONNECT_ERROR)?.[1];

		if (errorCallback) {
			errorCallback({ message: 'Connection failed' });
			expect(socketStore.error).toBe('Connection failed');
			expect(socketStore.isConnected).toBe(false);
		}
	});

	it('should emit when connected', async () => {
		await socketStore.connect();
		mockSocket.connected = true;

		socketStore.emit(SocketEvents.TYPING_START, { chatId: '1' });

		expect(mockSocket.emit).toHaveBeenCalledWith(SocketEvents.TYPING_START, { chatId: '1' });
	});

	it('should not emit when disconnected', async () => {
		mockSocket.connected = false;
		socketStore.emit(SocketEvents.TYPING_START, { chatId: '1' });

		expect(mockSocket.emit).not.toHaveBeenCalled();
	});
});
