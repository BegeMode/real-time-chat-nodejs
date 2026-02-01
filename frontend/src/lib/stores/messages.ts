import { writable, get } from 'svelte/store';
import type { IMessage, IUser } from '@shared/index';
import { chatsApi } from '$lib/api/chats';
import { socketStore } from './socket';
import { SocketEvents } from '@shared/index';
import { chatsStore } from './chats';

const PAGE_SIZE = 50;

export interface IDateItem {
	_id: string;
	type: 'date';
	text: string;
}

interface MessagesState {
	[chatId: string]: {
		items: Array<IMessage<IUser> | IDateItem>;
		isLoading: boolean;
		hasMore: boolean;
		error: string | null;
	};
}

/**
 * Helper to group messages by date
 */
function groupMessages(
	items: Array<IMessage<IUser> | IDateItem>
): Array<IMessage<IUser> | IDateItem> {
	// Filter out existing date dividers
	const rawMessages = items.filter(
		(item): item is IMessage<IUser> => !('type' in item && item.type === 'date')
	);

	// Sort messages by date to ensure they are in order
	rawMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

	const result: Array<IMessage<IUser> | IDateItem> = [];
	let lastDate: string | null = null;

	for (const msg of rawMessages) {
		const date = new Date(msg.createdAt);
		const dateStr = date.toDateString();

		if (dateStr !== lastDate) {
			result.push({
				_id: `date-${date.getTime()}`,
				type: 'date',
				text: date.toLocaleDateString('en-US', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})
			});
			lastDate = dateStr;
		}

		result.push(msg);
	}

	return result;
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
			const chatState = state[chatId];
			if (chatState?.isLoading) return;
			if (chatState?.items.length > 0 && !chatState?.error) return;

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
				const response = await chatsApi.getMessages(chatId, PAGE_SIZE);
				const items = response.items || [];

				update((s) => ({
					...s,
					[chatId]: {
						items: groupMessages(items),
						isLoading: false,
						hasMore: response.hasMore ?? items.length >= PAGE_SIZE,
						error: null
					}
				}));
			} catch (err) {
				update((s) => ({
					...s,
					[chatId]: {
						...(s[chatId] || {}),
						isLoading: false,
						error: (err as Error).message
					}
				}));
			}
		},

		/**
		 * Load earlier messages (pagination)
		 */
		async loadMore(chatId: string) {
			const state = get({ subscribe });
			const chatState = state[chatId];

			if (!chatState || chatState.isLoading || !chatState.hasMore) return;

			// Find the oldest message ID to use as 'before' cursor
			const oldestMessage = chatState.items.find((item): item is IMessage<IUser> => {
				return !('type' in item && item.type === 'date');
			});

			if (!oldestMessage) return;

			update((s) => ({
				...s,
				[chatId]: {
					...chatState,
					isLoading: true
				}
			}));

			try {
				const response = await chatsApi.getMessages(chatId, PAGE_SIZE, oldestMessage._id);
				const newItems = response.items || [];

				update((s) => ({
					...s,
					[chatId]: {
						items: groupMessages([...chatState.items, ...newItems]),
						isLoading: false,
						hasMore: response.hasMore ?? newItems.length >= PAGE_SIZE,
						error: null
					}
				}));
			} catch (err) {
				update((s) => ({
					...s,
					[chatId]: {
						...chatState,
						isLoading: false,
						error: (err as Error).message
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
						items: groupMessages([...chatMessages.items, message])
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
			} catch (err) {
				update((s) => ({
					...s,
					[chatId]: {
						...(s[chatId] || { items: [], isLoading: false, hasMore: false, error: null }),
						error: (err as Error).message
					}
				}));
				throw err;
			}
		}
	};
}

export const messagesStore = createMessagesStore();
