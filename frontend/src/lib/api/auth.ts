import { apiClient } from './client';
import { authStore } from '$lib/stores/auth';
import type { IAuthResponse, ILoginDto, IRegisterDto, IUser } from '@shared/index';
import { AxiosError } from 'axios';

export interface ApiError {
	message: string;
	statusCode?: number;
}

/**
 * Extracts an error message from AxiosError
 */
function extractErrorMessage(error: unknown): string {
	if (error instanceof AxiosError) {
		const data = error.response?.data as { message?: string | string[] } | undefined;
		if (data?.message) {
			// NestJS can return an array of messages during validation
			if (Array.isArray(data.message)) {
				return data.message.join(', ');
			}
			return data.message;
		}
		// Fallback to standard axios message
		return error.message;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return 'An unknown error occurred';
}

/**
 * Service for working with authentication
 */
export const authApi = {
	/**
	 * Register a new user
	 */
	async register(data: IRegisterDto): Promise<IAuthResponse> {
		try {
			authStore.setLoading(true);
			authStore.setError(null);

			const response = await apiClient.post<IAuthResponse>('/auth/register', data);
			const { user, accessToken } = response.data;

			authStore.setAuth(user, accessToken);

			return response.data;
		} catch (error) {
			const message = extractErrorMessage(error);
			authStore.setError(message);
			throw error;
		} finally {
			authStore.setLoading(false);
		}
	},

	/**
	 * Login a user
	 */
	async login(data: ILoginDto): Promise<IAuthResponse> {
		try {
			authStore.setLoading(true);
			authStore.setError(null);

			const response = await apiClient.post<IAuthResponse>('/auth/login', data);
			const { user, accessToken } = response.data;

			authStore.setAuth(user, accessToken);

			return response.data;
		} catch (error) {
			const message = extractErrorMessage(error);
			authStore.setError(message);
			throw error;
		} finally {
			authStore.setLoading(false);
		}
	},

	/**
	 * Logout a user
	 */
	async logout(): Promise<void> {
		try {
			await apiClient.post('/auth/logout');
		} catch {
			// Ignore errors during logout
		} finally {
			authStore.logout();
		}
	},

	/**
	 * Get current user
	 */
	async getMe(): Promise<IUser> {
		try {
			authStore.setLoading(true);

			const response = await apiClient.get<IUser>('/auth/me');
			authStore.setUser(response.data);

			return response.data;
		} catch (error) {
			const message = extractErrorMessage(error);
			authStore.setError(message);
			throw error;
		} finally {
			authStore.setLoading(false);
		}
	},

	/**
	 * Initialize authorization when the application loads
	 * Checks for a token and loads user data
	 */
	async initialize(): Promise<boolean> {
		if (!authStore.isLoggedIn()) {
			return false;
		}

		try {
			await this.getMe();
			return true;
		} catch {
			// Token is invalid - clear state
			authStore.logout();
			return false;
		}
	}
};
