import type { IUser } from '@shared/index';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';

const ACCESS_TOKEN_KEY = 'accessToken';

/**
 * Auth Store using Svelte 5 Runes with class-based architecture
 */
class AuthStore {
	// Reactive state using $state rune
	user = $state<IUser | null>(null);
	accessToken = $state<string | null>(null);
	isLoading = $state(false);
	error = $state<string | null>(null);

	constructor() {
		// Initialize access token from localStorage on browser
		if (browser) {
			this.accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
		}
	}

	// Computed properties using $derived
	get isAuthenticated() {
		return !!this.accessToken && !!this.user;
	}

	get currentUser() {
		return this.user;
	}

	/**
	 * Set authorization data after successful login/registration
	 */
	async setAuth(user: IUser, accessToken: string) {
		if (browser) {
			localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
		}
		this.user = user;
		this.accessToken = accessToken;
		this.error = null;

		// Connect socket after auth (dynamic import to avoid circular deps)
		const { socketStore } = await import('./socket.svelte');
		socketStore.connect();
	}

	/**
	 * Updates only access token (after refresh)
	 */
	async updateToken(accessToken: string) {
		if (browser) {
			localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
		}
		this.accessToken = accessToken;

		// Reconnect or update socket connection if needed
		const { socketStore } = await import('./socket.svelte');
		socketStore.connect();
	}

	/**
	 * Sets the current user
	 */
	async setUser(user: IUser) {
		this.user = user;
		this.error = null;

		// Connect socket if token exists
		const { socketStore } = await import('./socket.svelte');
		socketStore.connect();
	}

	/**
	 * Sets the loading state
	 */
	setLoading(isLoading: boolean) {
		this.isLoading = isLoading;
	}

	/**
	 * Sets the error state
	 */
	setError(error: string | null) {
		this.error = error;
		this.isLoading = false;
	}

	/**
	 * Clears the authorization state (logout)
	 */
	async logout() {
		if (browser) {
			localStorage.removeItem(ACCESS_TOKEN_KEY);
		}
		this.user = null;
		this.accessToken = null;
		this.isLoading = false;
		this.error = null;

		// Disconnect socket on logout
		const { socketStore } = await import('./socket.svelte');
		socketStore.disconnect();
	}

	/**
	 * Redirect to login page
	 */
	redirectToLogin() {
		if (browser) {
			goto('/login');
		}
	}

	/**
	 * Get current access token
	 */
	getAccessToken(): string | null {
		return this.accessToken;
	}

	/**
	 * Check if user is authorized
	 */
	isLoggedIn(): boolean {
		return !!this.accessToken;
	}
}

// Export singleton instance
export const authStore = new AuthStore();
