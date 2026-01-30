import { writable, derived, get } from 'svelte/store';
import type { IUser } from '@shared/index';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';

const ACCESS_TOKEN_KEY = 'accessToken';

export interface AuthState {
	user: IUser | null;
	accessToken: string | null;
	isLoading: boolean;
	error: string | null;
}

function createInitialState(): AuthState {
	let accessToken: string | null = null;

	if (browser) {
		accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
	}

	return {
		user: null,
		accessToken,
		isLoading: false,
		error: null
	};
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(createInitialState());

	return {
		subscribe,

		/**
		 * Set authorization data after successful login/registration
		 */
		setAuth(user: IUser, accessToken: string) {
			if (browser) {
				localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
			}
			update((state) => ({
				...state,
				user,
				accessToken,
				error: null
			}));
		},

		/**
		 * Updates only access token (after refresh)
		 */
		updateToken(accessToken: string) {
			if (browser) {
				localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
			}
			update((state) => ({
				...state,
				accessToken
			}));
		},

		/**
		 * Sets the current user
		 */
		setUser(user: IUser) {
			update((state) => ({
				...state,
				user,
				error: null
			}));
		},

		/**
		 * Sets the loading state
		 */
		setLoading(isLoading: boolean) {
			update((state) => ({
				...state,
				isLoading
			}));
		},

		/**
		 * Sets the error state
		 */
		setError(error: string | null) {
			update((state) => ({
				...state,
				error,
				isLoading: false
			}));
		},

		/**
		 * Clears the authorization state (logout)
		 */
		logout() {
			if (browser) {
				localStorage.removeItem(ACCESS_TOKEN_KEY);
			}
			set({
				user: null,
				accessToken: null,
				isLoading: false,
				error: null
			});
		},

		/**
		 * Redirect to login page
		 */
		redirectToLogin() {
			if (browser) {
				goto('/login');
			}
		},

		/**
		 * Get current access token
		 */
		getAccessToken(): string | null {
			return get({ subscribe }).accessToken;
		},

		/**
		 * Check if user is authorized
		 */
		isLoggedIn(): boolean {
			return !!get({ subscribe }).accessToken;
		}
	};
}

export const authStore = createAuthStore();

// Derived store for checking authorization
export const isAuthenticated = derived(authStore, ($auth) => !!$auth.accessToken && !!$auth.user);

// Derived store for user only
export const currentUser = derived(authStore, ($auth) => $auth.user);
