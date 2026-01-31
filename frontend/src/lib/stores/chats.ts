import { writable, derived } from 'svelte/store';
import type { IChat, IMessage } from '@shared/index';
import { chatsApi } from '$lib/api/chats';
import { socketStore } from './socket';
import { SocketEvents } from '@shared/index';

interface ChatsState {
	items: IChat[];
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
		 * Handle new message from socket
		 */
		addMessage(chatId: string, message: IMessage) {
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
