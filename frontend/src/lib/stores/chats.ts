import { writable, derived } from 'svelte/store';
import type { IChat, IMessage, IUser } from '@shared/index';
import { chatsApi } from '$lib/api/chats';
import { socketStore } from './socket';
import { SocketEvents } from '@shared/index';

interface ChatsState {
	items: IChat<IUser>[];
	activeChatId: string | null;
	isLoading: boolean;
	error: string | null;
}

function createChatsStore() {
	const { subscribe, set, update } = writable<ChatsState>({
		items: [],
		activeChatId: null,
		isLoading: false,
		error: null
	});

	return {
		subscribe,

		/**
		 * Load all chats
		 */
		async loadChats() {
			update((s) => ({ ...s, isLoading: true, error: null }));
			try {
				const chats = await chatsApi.getChats();
				update((s) => ({ ...s, items: chats, isLoading: false }));
			} catch (err: any) {
				update((s) => ({ ...s, error: err.message, isLoading: false }));
			}
		},

		/**
		 * Set active chat
		 */
		setActiveChat(chatId: string | null) {
			update((s) => ({ ...s, activeChatId: chatId }));
		},

		/**
		 * Create or get a chat with user(s)
		 */
		async createChat(userIds: string[]) {
			update((s) => ({ ...s, isLoading: true, error: null }));
			try {
				const chat = await chatsApi.getOrCreateChat(userIds);
				update((s) => {
					// Add chat to list if not already there
					const exists = s.items.find((c) => c._id === chat._id);
					const items = exists ? s.items : [chat, ...s.items];
					return { ...s, items, activeChatId: chat._id, isLoading: false };
				});
				return chat;
			} catch (err: any) {
				update((s) => ({ ...s, error: err.message, isLoading: false }));
				throw err;
			}
		},

		/**
		 * Handle new message from socket
		 */
		addMessage(chatId: string, message: IMessage<IUser>) {
			update((s) => {
				const items = s.items.map((chat) => {
					if (chat._id === chatId) {
						return {
							...chat,
							lastMessage: message,
							updatedAt: message.createdAt
						};
					}
					return chat;
				});

				// Sort chats by updatedAt
				items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

				return { ...s, items };
			});
		},

		/**
		 * Update user online status
		 */
		setUserStatus(userId: string, isOnline: boolean) {
			update((s) => {
				const items = s.items.map((chat) => {
					const members = chat.members.map((member) => {
						if (member.user._id === userId) {
							return { ...member, user: { ...member.user, isOnline } };
						}
						return member;
					});
					return { ...chat, members };
				});
				return { ...s, items };
			});
		}
	};
}

export const chatsStore = createChatsStore();

// Derived store for currently active chat
export const activeChat = derived(
	chatsStore,
	($chats) => $chats.items.find((c) => c._id === $chats.activeChatId) || null
);
