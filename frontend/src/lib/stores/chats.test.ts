import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IChat, IUser, IMessage } from '@shared/index';

// Mock API
vi.mock('$lib/api/chats', () => ({
	chatsApi: {
		getChats: vi.fn(),
		getOrCreateChat: vi.fn()
	}
}));

// Now import the store
import { chatsStore } from './chats.svelte';
import { chatsApi } from '$lib/api/chats';

describe('ChatsStore', () => {
	const mockUser: IUser = {
		_id: 'u1',
		username: 'user1',
		email: 'u1@ex.com',
		isOnline: false
	};

	const mockChat: IChat<IUser> = {
		_id: 'c1',
		members: [{ user: mockUser, unreadCount: 0 }],
		updatedAt: new Date(),
		createdAt: new Date(),
		createdBy: 'c1'
	};

	beforeEach(() => {
		chatsStore.items = [];
		chatsStore.activeChatId = null;
		chatsStore.isLoading = false;
		chatsStore.error = null;
		chatsStore.typingUsers = {};
		vi.clearAllMocks();
	});

	it('should initialize with empty state', () => {
		expect(chatsStore.items).toEqual([]);
		expect(chatsStore.activeChat).toBeNull();
	});

	it('should load chats correctly', async () => {
		const mockChats = [mockChat];
		vi.mocked(chatsApi.getChats).mockResolvedValue(mockChats);

		await chatsStore.loadChats();

		expect(chatsStore.items).toEqual(mockChats);
		expect(chatsStore.isLoading).toBe(false);
	});

	it('should handle load error', async () => {
		const errorMsg = 'Failed to fetch';
		vi.mocked(chatsApi.getChats).mockRejectedValue(new Error(errorMsg));

		await chatsStore.loadChats();

		expect(chatsStore.error).toBe(errorMsg);
		expect(chatsStore.isLoading).toBe(false);
	});

	it('should set active chat', () => {
		chatsStore.items = [mockChat];
		chatsStore.setActiveChat('c1');
		expect(chatsStore.activeChatId).toBe('c1');
		expect(chatsStore.activeChat).toEqual(mockChat);
	});

	it('should add message and sort chats', () => {
		const chat1: IChat<IUser> = { _id: 'c1', updatedAt: new Date('2023-01-01') } as any;
		const chat2: IChat<IUser> = { _id: 'c2', updatedAt: new Date('2023-01-02') } as any;
		chatsStore.items = [chat1, chat2];

		const newMessage: IMessage<IUser> = {
			_id: 'm1',
			chatId: 'c1',
			text: 'hi',
			createdAt: new Date('2024-01-01'),
			senderId: mockUser
		};

		chatsStore.addMessage('c1', newMessage);

		expect(chatsStore.items[0]._id).toBe('c1'); // c1 should be first now
		expect(chatsStore.items[0].lastMessage).toEqual(newMessage);
	});

	it('should update user status', () => {
		chatsStore.items = [mockChat];
		chatsStore.setUserStatus('u1', true);

		expect(chatsStore.items[0].members[0].user.isOnline).toBe(true);
	});

	it('should handle typing status', () => {
		chatsStore.setTyping('c1', 'u1', true);
		expect(chatsStore.typingUsers['c1']).toContain('u1');

		chatsStore.setTyping('c1', 'u2', true);
		expect(chatsStore.typingUsers['c1']).toEqual(['u1', 'u2']);

		chatsStore.setTyping('c1', 'u1', false);
		expect(chatsStore.typingUsers['c1']).toEqual(['u2']);
	});
});
