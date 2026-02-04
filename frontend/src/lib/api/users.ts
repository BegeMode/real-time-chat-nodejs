import { apiClient } from './client';
import type { IUser } from '@shared/index';

export const usersApi = {
	/**
	 * Search for users by username or email
	 */
	async searchUsers(query: string, signal?: AbortSignal): Promise<IUser[]> {
		const response = await apiClient.get<IUser[]>('/users/search', {
			params: { q: query },
			signal
		});
		return response.data;
	}
};
