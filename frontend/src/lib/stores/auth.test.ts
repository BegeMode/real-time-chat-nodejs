import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the store
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$app/environment', () => {
	const localStorageMock = {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn()
	};
	(global as any).localStorage = localStorageMock;
	return {
		browser: true
	};
});

// Mock socketStore to avoid circular dependency issues and real connections
vi.mock('./socket.svelte', () => ({
	socketStore: {
		connect: vi.fn(),
		disconnect: vi.fn()
	}
}));

// Now import the store
import { authStore } from './auth.svelte';
import type { IUser } from '@shared/index';

describe('AuthStore', () => {
	const mockUser: IUser = {
		_id: '1',
		username: 'testuser',
		email: 'test@example.com',
		avatar: '',
		createdAt: new Date()
	};

	let store: Record<string, string> = {};

	beforeEach(async () => {
		store = {};
		const ls = (global as any).localStorage;
		ls.getItem.mockImplementation((key: string) => store[key] || null);
		ls.setItem.mockImplementation((key: string, value: string) => {
			store[key] = value.toString();
		});
		ls.removeItem.mockImplementation((key: string) => {
			delete store[key];
		});
		ls.clear.mockImplementation(() => {
			store = {};
		});

		await authStore.logout();
		vi.clearAllMocks();
	});

	it('should initialize with null state', () => {
		expect(authStore.user).toBeNull();
		expect(authStore.accessToken).toBeNull();
		expect(authStore.isAuthenticated).toBe(false);
	});

	it('should set auth data correctly', async () => {
		const token = 'fake-token';
		await authStore.setAuth(mockUser, token);

		expect(authStore.user).toEqual(mockUser);
		expect(authStore.accessToken).toBe(token);
		expect(authStore.isAuthenticated).toBe(true);
		expect((global as any).localStorage.setItem).toHaveBeenCalledWith('accessToken', token);
		expect(store['accessToken']).toBe(token);
	});

	it('should update token correctly', async () => {
		const newToken = 'new-fake-token';
		await authStore.updateToken(newToken);

		expect(authStore.accessToken).toBe(newToken);
		expect((global as any).localStorage.setItem).toHaveBeenCalledWith('accessToken', newToken);
		expect(store['accessToken']).toBe(newToken);
	});

	it('should set user correctly', async () => {
		await authStore.setUser(mockUser);

		expect(authStore.user).toEqual(mockUser);
		expect(authStore.error).toBeNull();
	});

	it('should handle logout', async () => {
		await authStore.setAuth(mockUser, 'token');
		await authStore.logout();

		expect(authStore.user).toBeNull();
		expect(authStore.accessToken).toBeNull();
		expect(authStore.isAuthenticated).toBe(false);
		expect((global as any).localStorage.removeItem).toHaveBeenCalledWith('accessToken');
		expect(store['accessToken']).toBeUndefined();
	});

	it('should set loading state', () => {
		authStore.setLoading(true);
		expect(authStore.isLoading).toBe(true);

		authStore.setLoading(false);
		expect(authStore.isLoading).toBe(false);
	});

	it('should set error state', () => {
		const errorMsg = 'Invalid credentials';
		authStore.setError(errorMsg);

		expect(authStore.error).toBe(errorMsg);
		expect(authStore.isLoading).toBe(false);
	});
});
