import type { IChat, IMessage, IUser } from '@shared/index';
import { chatsApi } from '$lib/api/chats';

/**
 * Chats Store using Svelte 5 Runes with class-based architecture
 */
class ChatsStore {
	// Reactive state using $state rune
	items = $state<IChat<IUser>[]>([]);
	activeChatId = $state<string | null>(null);
	isLoading = $state(false);
	error = $state<string | null>(null);
	typingUsers = $state<Record<string, string[]>>({}); // chatId -> list of userIds

	// Computed property for active chat
	get activeChat() {
		return this.items.find((c) => c._id === this.activeChatId) || null;
	}

	/**
	 * Load all chats
	 */
	async loadChats() {
		this.isLoading = true;
		this.error = null;

		try {
			const chats = await chatsApi.getChats();
			this.items = chats;
			this.isLoading = false;
		} catch (err) {
			this.error = (err as Error).message;
			this.isLoading = false;
		}
	}

	/**
	 * Set active chat
	 */
	setActiveChat(chatId: string | null) {
		this.activeChatId = chatId;
	}

	/**
	 * Create or get a chat with user(s)
	 */
	async createChat(userIds: string[]) {
		this.isLoading = true;
		this.error = null;

		try {
			const chat = await chatsApi.getOrCreateChat(userIds);

			// Add chat to list if not already there
			const exists = this.items.find((c) => c._id === chat._id);
			if (!exists) {
				this.items = [chat, ...this.items];
			}
			this.activeChatId = chat._id;
			this.isLoading = false;

			return chat;
		} catch (err) {
			this.error = (err as Error).message;
			this.isLoading = false;
			throw err;
		}
	}

	/**
	 * Handle new message from socket
	 */
	addMessage(chatId: string, message: IMessage<IUser>) {
		this.items = this.items.map((chat) => {
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
		this.items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
	}

	/**
	 * Update user online status
	 */
	setUserStatus(userId: string, isOnline: boolean) {
		this.items = this.items.map((chat) => {
			const members = chat.members.map((member) => {
				if (member.user._id === userId) {
					return { ...member, user: { ...member.user, isOnline } };
				}
				return member;
			});
			return { ...chat, members };
		});
	}

	/**
	 * Update typing status
	 * Uses simple assignment for deep reactivity in Svelte 5
	 */
	setTyping(chatId: string, userId: string, isTyping: boolean) {
		const currentTyping = this.typingUsers[chatId] || [];
		let newTyping: string[];

		if (isTyping) {
			if (currentTyping.includes(userId)) return;
			newTyping = [...currentTyping, userId];
		} else {
			if (!currentTyping.includes(userId)) return;
			newTyping = currentTyping.filter((id) => id !== userId);
		}

		// Simple assignment triggers deep reactivity in Svelte 5
		this.typingUsers = {
			...this.typingUsers,
			[chatId]: newTyping
		};
	}

	/**
	 * Get typing users for a specific chat
	 */
	getTypingUsers(chatId: string): string[] {
		return this.typingUsers[chatId] || [];
	}
}

// Export singleton instance
export const chatsStore = new ChatsStore();
