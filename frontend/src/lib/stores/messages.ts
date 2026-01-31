import { writable, get } from 'svelte/store';
import type { IMessage, IUser } from '@shared/index';
import { chatsApi } from '$lib/api/chats';
import { socketStore } from './socket';
import { SocketEvents } from '@shared/index';
import { chatsStore } from './chats';

interface MessagesState {
	[chatId: string]: {
		items: IMessage<IUser>[];
		isLoading: boolean;
		hasMore: boolean;
		error: string | null;
	};
}

function createMessagesStore() {
	const { subscribe, update } = writable<MessagesState>({});

	return {
		subscribe,

		/**
		 * Load messages for a chat
		 */
		async loadMessages(chatId: string) {
			const state = get({ subscribe });
			if (state[chatId]?.items.length > 0 && !state[chatId]?.error) return;

			update((s) => ({
				...s,
				[chatId]: {
					items: s[chatId]?.items || [],
					isLoading: true,
					hasMore: true,
					error: null
				}
			}));

			try {
				const response = await chatsApi.getMessages(chatId);
				// Assuming response.items is the array of messages
				const items = response.items || [];

				update((s) => ({
					...s,
					[chatId]: {
						items,
						isLoading: false,
						hasMore: items.length >= 50, // basic check
						error: null
					}
				}));
			} catch (err: any) {
				update((s) => ({
					...s,
					[chatId]: {
						...(s[chatId] || {}),
						isLoading: false,
						error: err.message
					}
				}));
			}
		},

		/**
		 * Add a new message to the chat
		 */
		addMessage(chatId: string, message: IMessage<IUser>) {
			update((s) => {
				const chatMessages = s[chatId] || {
					items: [],
					isLoading: false,
					hasMore: false,
					error: null
				};

				// Avoid duplicates
				if (chatMessages.items.find((m) => m._id === message._id)) {
					return s;
				}

				return {
					...s,
					[chatId]: {
						...chatMessages,
						items: [...chatMessages.items, message]
					}
				};
			});

			// Also update last message in chatsStore
			chatsStore.addMessage(chatId, message);
		},

		/**
		 * Send a message via REST and let socket handle the broadcast
		 */
		async sendMessage(chatId: string, text: string) {
			try {
				const message = await chatsApi.sendMessage(chatId, text);
				this.addMessage(chatId, message);
				return message;
			} catch (err: any) {
				update((s) => ({
					...s,
					[chatId]: {
						...(s[chatId] || { items: [], isLoading: false, hasMore: false, error: null }),
						error: err.message
					}
				}));
				throw err;
			}
		}
	};
}

export const messagesStore = createMessagesStore();
