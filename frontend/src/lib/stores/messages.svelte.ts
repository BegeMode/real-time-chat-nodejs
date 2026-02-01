import type { IMessage, IUser } from '@shared/index';
import { chatsApi } from '$lib/api/chats';

const PAGE_SIZE = 50;

export interface IDateItem {
	_id: string;
	type: 'date';
	text: string;
}

interface ChatMessagesState {
	items: Array<IMessage<IUser> | IDateItem>;
	isLoading: boolean;
	hasMore: boolean;
	error: string | null;
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

/**
 * Messages Store using Svelte 5 Runes with class-based architecture
 */
class MessagesStore {
	// Reactive state: map of chatId -> messages state
	private _chats = $state<Record<string, ChatMessagesState>>({});

	/**
	 * Get messages state for a specific chat
	 */
	getChatState(chatId: string): ChatMessagesState | undefined {
		return this._chats[chatId];
	}

	/**
	 * Get messages for a specific chat (with date grouping)
	 */
	getMessages(chatId: string): Array<IMessage<IUser> | IDateItem> {
		return this._chats[chatId]?.items || [];
	}

	/**
	 * Check if messages are loading for a chat
	 */
	isLoadingChat(chatId: string): boolean {
		return this._chats[chatId]?.isLoading || false;
	}

	/**
	 * Check if there are more messages to load
	 */
	hasMoreMessages(chatId: string): boolean {
		return this._chats[chatId]?.hasMore || false;
	}

	/**
	 * Get error for a chat
	 */
	getError(chatId: string): string | null {
		return this._chats[chatId]?.error || null;
	}

	/**
	 * Load messages for a chat
	 */
	async loadMessages(chatId: string) {
		const chatState = this._chats[chatId];
		if (chatState?.isLoading) return;
		if (chatState?.items.length > 0 && !chatState?.error) return;

		this._chats = {
			...this._chats,
			[chatId]: {
				items: this._chats[chatId]?.items || [],
				isLoading: true,
				hasMore: true,
				error: null
			}
		};

		try {
			const response = await chatsApi.getMessages(chatId, PAGE_SIZE);
			const items = response.items || [];

			this._chats = {
				...this._chats,
				[chatId]: {
					items: groupMessages(items),
					isLoading: false,
					hasMore: response.hasMore ?? items.length >= PAGE_SIZE,
					error: null
				}
			};
		} catch (err) {
			this._chats = {
				...this._chats,
				[chatId]: {
					...(this._chats[chatId] || { items: [], hasMore: false, error: null }),
					isLoading: false,
					error: (err as Error).message
				}
			};
		}
	}

	/**
	 * Load earlier messages (pagination)
	 */
	async loadMore(chatId: string) {
		const chatState = this._chats[chatId];

		if (!chatState || chatState.isLoading || !chatState.hasMore) return;

		// Find the oldest message ID to use as 'before' cursor
		const oldestMessage = chatState.items.find((item): item is IMessage<IUser> => {
			return !('type' in item && item.type === 'date');
		});

		if (!oldestMessage) return;

		this._chats = {
			...this._chats,
			[chatId]: {
				...chatState,
				isLoading: true
			}
		};

		try {
			const response = await chatsApi.getMessages(chatId, PAGE_SIZE, oldestMessage._id);
			const newItems = response.items || [];

			this._chats = {
				...this._chats,
				[chatId]: {
					items: groupMessages([...chatState.items, ...newItems]),
					isLoading: false,
					hasMore: response.hasMore ?? newItems.length >= PAGE_SIZE,
					error: null
				}
			};
		} catch (err) {
			this._chats = {
				...this._chats,
				[chatId]: {
					...chatState,
					isLoading: false,
					error: (err as Error).message
				}
			};
		}
	}

	/**
	 * Add a new message to the chat
	 */
	async addMessage(chatId: string, message: IMessage<IUser>) {
		const chatMessages = this._chats[chatId] || {
			items: [],
			isLoading: false,
			hasMore: false,
			error: null
		};

		// Avoid duplicates
		if (chatMessages.items.find((m) => m._id === message._id)) {
			return;
		}

		this._chats = {
			...this._chats,
			[chatId]: {
				...chatMessages,
				items: groupMessages([...chatMessages.items, message])
			}
		};

		// Also update last message in chatsStore (dynamic import to avoid circular deps)
		const { chatsStore } = await import('./chats.svelte');
		chatsStore.addMessage(chatId, message);
	}

	/**
	 * Send a message via REST and let socket handle the broadcast
	 */
	async sendMessage(chatId: string, text: string) {
		try {
			const message = await chatsApi.sendMessage(chatId, text);
			await this.addMessage(chatId, message);
			return message;
		} catch (err) {
			this._chats = {
				...this._chats,
				[chatId]: {
					...(this._chats[chatId] || { items: [], isLoading: false, hasMore: false, error: null }),
					error: (err as Error).message
				}
			};
			throw err;
		}
	}
}

// Export singleton instance
export const messagesStore = new MessagesStore();
