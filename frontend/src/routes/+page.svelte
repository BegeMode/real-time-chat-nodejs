<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { authStore, isAuthenticated, currentUser, socketStore } from '$lib';
	import { authApi } from '$lib/api/auth';

	let user = $derived($currentUser);
	let authenticated = $derived($isAuthenticated);
	let isSocketConnected = $derived($socketStore.isConnected);

	// Redirect to login if not authorized
	onMount(() => {
		const unsubscribe = isAuthenticated.subscribe((value) => {
			// Wait for the store to initialize (after layout mount)
			if (!$authStore.isLoading && !value) {
				goto('/login');
			}
		});

		return unsubscribe;
	});

	async function handleLogout() {
		await authApi.logout();
		goto('/login');
	}
</script>

<svelte:head>
	<title>RealTime Chat</title>
	<meta name="description" content="RealTime Chat for real-time communication" />
</svelte:head>

{#if authenticated && user}
	<div class="app-container">
		<header class="app-header">
			<h1>RealTime Chat</h1>
			<div class="user-info">
				<div class="socket-status" class:connected={isSocketConnected}>
					<span class="status-dot"></span>
					<span class="status-text">{isSocketConnected ? 'Connected' : 'Disconnected'}</span>
				</div>
				<span class="username">{user.username}</span>
				<button class="btn-logout" onclick={handleLogout}>Logout</button>
			</div>
		</header>

		<main class="app-main">
			<div class="welcome-message">
				<h2>Welcome, {user.username}!</h2>
				<p>Chat interface will be here...</p>
			</div>
		</main>
	</div>
{:else}
	<div class="loading-screen">
		<div class="loading-spinner"></div>
	</div>
{/if}

<style>
	.app-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--color-bg-page);
	}

	.app-header {
		background: var(--color-bg-card);
		padding: var(--spacing-4) var(--spacing-8);
		box-shadow: var(--shadow-sm);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.app-header h1 {
		margin: 0;
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: var(--spacing-4);
	}

	.username {
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
	}

	.btn-logout {
		padding: var(--spacing-2) var(--spacing-4);
		background: transparent;
		color: var(--color-danger);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-base);
		font-size: var(--font-size-sm);
		font-family: var(--font-family-base);
		cursor: pointer;
		transition:
			background var(--transition-base),
			color var(--transition-base);
	}

	.btn-logout:hover {
		background: var(--color-danger);
		color: var(--color-text-inverse);
	}

	.socket-status {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		padding: var(--spacing-1) var(--spacing-3);
		background: var(--color-bg-page);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-danger);
	}

	.socket-status.connected .status-dot {
		background: var(--color-success);
		box-shadow: 0 0 8px rgba(var(--color-success-rgb), 0.4);
	}

	.app-main {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-8);
	}

	.welcome-message {
		text-align: center;
		color: var(--color-text-secondary);
	}

	.welcome-message h2 {
		color: var(--color-text-primary);
		margin-bottom: var(--spacing-2);
	}

	.loading-screen {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-page);
	}

	.loading-spinner {
		width: 2.5rem;
		height: 2.5rem;
		border: 3px solid var(--color-gray-200);
		border-top-color: var(--color-primary);
		border-radius: var(--radius-full);
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
