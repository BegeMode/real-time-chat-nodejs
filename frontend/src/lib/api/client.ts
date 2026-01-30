import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { authStore } from '$lib/stores/auth';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

// API base URL - you can set it in .env file
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Flag to prevent multiple refresh requests
let isRefreshing = false;
// Queue of requests waiting for token refresh
let failedQueue: Array<{
	resolve: (token: string) => void;
	reject: (error: Error) => void;
}> = [];

/**
 * Processes the queue of requests after refresh
 */
function processQueue(error: Error | null, token: string | null = null) {
	failedQueue.forEach((prom) => {
		if (error) {
			prom.reject(error);
		} else if (token) {
			prom.resolve(token);
		}
	});
	failedQueue = [];
}

/**
 * Creates and configures axios instance
 */
function createApiClient(): AxiosInstance {
	const client = axios.create({
		baseURL: API_BASE_URL,
		headers: {
			'Content-Type': 'application/json'
		},
		// Important for sending cookies (refreshToken)
		withCredentials: true
	});

	// Request interceptor - adds Authorization header
	client.interceptors.request.use(
		(config: InternalAxiosRequestConfig) => {
			const token = authStore.getAccessToken();
			if (token && config.headers) {
				config.headers.Authorization = `Bearer ${token}`;
			}
			return config;
		},
		(error) => Promise.reject(error)
	);

	// Response interceptor - handles 401 errors
	client.interceptors.response.use(
		(response) => response,
		async (error: AxiosError) => {
			const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

			// If 401 error or request has already been retried - throw error
			if (error.response?.status !== 401 || originalRequest._retry) {
				return Promise.reject(error);
			}

			// If this is a refresh request - don't try to update the token again
			if (originalRequest.url?.includes('/auth/refresh')) {
				authStore.logout();
				if (browser) {
					goto('/login');
				}
				return Promise.reject(error);
			}

			// If refresh is already in progress - add request to queue
			if (isRefreshing) {
				return new Promise<string>((resolve, reject) => {
					failedQueue.push({ resolve, reject });
				})
					.then((token) => {
						if (originalRequest.headers) {
							originalRequest.headers.Authorization = `Bearer ${token}`;
						}
						return client(originalRequest);
					})
					.catch((err) => Promise.reject(err));
			}

			originalRequest._retry = true;
			isRefreshing = true;

			try {
				// Try to update token
				const response = await client.post<{ accessToken: string }>('/auth/refresh');
				const { accessToken } = response.data;

				// Update token in store
				authStore.updateToken(accessToken);

				// Process queue of waiting requests
				processQueue(null, accessToken);

				// Retry original request with new token
				if (originalRequest.headers) {
					originalRequest.headers.Authorization = `Bearer ${accessToken}`;
				}
				return client(originalRequest);
			} catch (refreshError) {
				// Refresh failed - logout user
				processQueue(refreshError as Error, null);
				authStore.logout();
				if (browser) {
					goto('/login');
				}
				return Promise.reject(refreshError);
			} finally {
				isRefreshing = false;
			}
		}
	);

	return client;
}

export const apiClient = createApiClient();
