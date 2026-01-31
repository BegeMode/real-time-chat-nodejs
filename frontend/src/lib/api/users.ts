import { apiClient } from './client';
import type { IUser } from '@shared/index';

export const usersApi = {
	/**
	 * Search for users by username or email
	 */
	async searchUsers(query: string): Promise<IUser[]> {
		const response = await apiClient.get<{ success: boolean; data: IUser[] }>('/users/search', {
			params: { q: query }
		});
		return response.data.data;
	}
};
