import { apiClient } from './client';
import type { IMessage, IChat, IUser } from '@shared/index';

export const chatsApi = {
	/**
	 * Get all chats for the current user
	 */
	async getChats(): Promise<IChat<IUser>[]> {
		const response = await apiClient.get<{ success: boolean; data: IChat<IUser>[] }>('/chats');
		return response.data.data;
	},

	/**
	 * Get or create a chat with user(s)
	 */
	async getOrCreateChat(userIds: string[]): Promise<IChat<IUser>> {
		const response = await apiClient.post<{ success: boolean; data: IChat<IUser> }>('/chats', {
			userIds
		});
		return response.data.data;
	},

	/**
	 * Get messages for a chat
	 */
	async getMessages(chatId: string, limit = 50, before?: string): Promise<any> {
		const response = await apiClient.get(`/chats/messages/${chatId}`, {
			params: { limit, before }
		});
		return response.data.data;
	},

	/**
	 * Send a new message
	 */
	async sendMessage(chatId: string, text: string): Promise<IMessage<IUser>> {
		const response = await apiClient.post<{ success: boolean; data: IMessage<IUser> }>(
			'/chats/messages',
			{
				chatId,
				text
			}
		);
		return response.data.data;
	},

	/**
	 * Delete a message
	 */
	async deleteMessage(messageId: string, forEveryone = false): Promise<void> {
		await apiClient.delete(`/chats/messages/${messageId}`, {
			params: { forEveryone }
		});
	},

	/**
	 * Delete (hide) a chat
	 */
	async deleteChat(chatId: string): Promise<void> {
		await apiClient.delete(`/chats/${chatId}`);
	}
};
