<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { authStore, isAuthenticated, currentUser, socketStore } from '$lib';
	import { chatsStore } from '$lib/stores/chats';
	import { authApi } from '$lib/api/auth';
	import ChatSidebar from '$lib/components/ChatSidebar.svelte';
	import ChatWindow from '$lib/components/ChatWindow.svelte';
	import { MessageSquare, LogOut } from '$lib/components/icons';

	let user = $derived($currentUser);
	let authenticated = $derived($isAuthenticated);
	let isSocketConnected = $derived($socketStore.isConnected);

	// Redirect to login if not authorized
	onMount(async () => {
		const unsubscribe = isAuthenticated.subscribe((value) => {
			if (!$authStore.isLoading && !value) {
				goto('/login');
			}
		});

		if (authenticated) {
			await chatsStore.loadChats();
		}

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
	<div class="app-layout">
		<header class="app-header">
			<div class="header-left">
				<div class="logo">
					<MessageSquare size={24} />
					<h1>RealTime</h1>
				</div>
			</div>

			<div class="header-right">
				<div
					class="socket-status"
					class:connected={isSocketConnected}
					title={isSocketConnected ? 'Connected' : 'Disconnected'}
				>
					<span class="status-dot"></span>
					<span class="status-text">{isSocketConnected ? 'Live' : 'Offline'}</span>
				</div>
				<div class="user-profile">
					<div class="avatar-sm">{user.username[0].toUpperCase()}</div>
					<span class="username">{user.username}</span>
				</div>
				<button class="btn-logout" onclick={handleLogout} aria-label="Logout">
					<LogOut />
				</button>
			</div>
		</header>

		<div class="main-content">
			<ChatSidebar />
			<ChatWindow />
		</div>
	</div>
{:else}
	<div class="loading-screen">
		<div class="loading-spinner"></div>
	</div>
{/if}

<style>
	:global(body) {
		overflow: hidden;
	}

	.app-layout {
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--color-bg-page);
	}

	.app-header {
		height: var(--header-height);
		background: var(--color-white);
		border-bottom: 1px solid var(--color-border);
		padding: 0 var(--spacing-6);
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-shrink: 0;
		z-index: 20;
	}

	.header-left {
		display: flex;
		align-items: center;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		color: var(--color-primary);
	}

	.logo h1 {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		margin: 0;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: var(--spacing-6);
	}

	.user-profile {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
	}

	.avatar-sm {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		background: var(--color-gray-100);
		color: var(--color-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-sm);
	}

	.username {
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
		font-size: var(--font-size-sm);
	}

	.btn-logout {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: transparent;
		color: var(--color-gray-400);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-base);
	}

	.btn-logout:hover {
		background: var(--color-danger-light);
		color: var(--color-danger);
		border-color: var(--color-danger);
	}

	.socket-status {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		padding: var(--spacing-1) var(--spacing-3);
		background: var(--color-gray-50);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-gray-300);
	}

	.socket-status.connected .status-dot {
		background: var(--color-success);
		box-shadow: 0 0 8px rgba(var(--color-success-rgb), 0.4);
	}

	.socket-status.connected {
		color: var(--color-success);
		background: rgba(var(--color-success-rgb), 0.1);
	}

	.main-content {
		flex: 1;
		display: flex;
		overflow: hidden;
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
