import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IMessage, IUser } from '@shared/index';

// Mock API
vi.mock('$lib/api/chats', () => ({
	chatsApi: {
		getMessages: vi.fn(),
		sendMessage: vi.fn()
	}
}));

// Mock chatsStore
vi.mock('./chats.svelte', () => ({
	chatsStore: {
		addMessage: vi.fn()
	}
}));

// Now import the store
import { messagesStore, type IDateItem } from './messages.svelte';
import { chatsApi } from '$lib/api/chats';

describe('MessagesStore', () => {
	const mockUser: IUser = { _id: 'u1', username: 'user1' } as any;
	const mockMessage: IMessage<IUser> = {
		_id: 'm1',
		chatId: 'c1',
		content: 'test message',
		sender: mockUser,
		createdAt: new Date('2023-01-01T10:00:00Z')
	} as any;

	beforeEach(() => {
		// Reset private state using any because it's private
		(messagesStore as any)._chats = {};
		vi.clearAllMocks();
	});

	it('should initialize with empty state', () => {
		expect(messagesStore.getMessages('c1')).toEqual([]);
		expect(messagesStore.isLoadingChat('c1')).toBe(false);
	});

	it('should load messages and group by date', async () => {
		const mockResponse = {
			items: [mockMessage],
			hasMore: false
		};
		vi.mocked(chatsApi.getMessages).mockResolvedValue(mockResponse);

		await messagesStore.loadMessages('c1');

		const messages = messagesStore.getMessages('c1');
		expect(messages.length).toBe(2); // Date divider + message
		expect((messages[0] as IDateItem).type).toBe('date');
		expect(messages[1]).toEqual(mockMessage);
		expect(messagesStore.hasMoreMessages('c1')).toBe(false);
	});

	it('should handle pagination (loadMore)', async () => {
		// Setup initial state
		(messagesStore as any)._chats = {
			c1: {
				items: [mockMessage], // Date divider missing for simplicity in manual setup
				isLoading: false,
				hasMore: true,
				error: null
			}
		};

		const olderMessage: IMessage<IUser> = {
			...mockMessage,
			_id: 'm0',
			createdAt: new Date('2022-12-31T10:00:00Z')
		};

		vi.mocked(chatsApi.getMessages).mockResolvedValue({
			items: [olderMessage],
			hasMore: false
		});

		await messagesStore.loadMore('c1');

		const messages = messagesStore.getMessages('c1');
		// Should have: Date(Dec 31) -> m0 -> Date(Jan 1) -> m1
		expect(messages.length).toBe(4);
		expect((messages[0] as IDateItem).type).toBe('date');
		expect(messages[1]._id).toBe('m0');
		expect((messages[2] as IDateItem).type).toBe('date');
		expect(messages[3]._id).toBe('m1');
	});

	it('should add new message and avoid duplicates', async () => {
		await messagesStore.addMessage('c1', mockMessage);
		expect(messagesStore.getMessages('c1').length).toBe(2); // Date + m1

		await messagesStore.addMessage('c1', mockMessage);
		expect(messagesStore.getMessages('c1').length).toBe(2); // Still 2
	});

	it('should handle sendMessage', async () => {
		vi.mocked(chatsApi.sendMessage).mockResolvedValue(mockMessage);

		await messagesStore.sendMessage('c1', 'test message');

		expect(chatsApi.sendMessage).toHaveBeenCalledWith('c1', 'test message');
		expect(messagesStore.getMessages('c1').length).toBe(2);
	});
});
