<script lang="ts">
	import Modal from './Modal.svelte';
	import { usersApi } from '$lib/api/users';
	import { chatsStore } from '$lib/stores/chats.svelte';
	import type { IUser } from '@shared/index';
	import { ChevronRight } from './icons';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen = $bindable(), onClose }: Props = $props();

	let searchQuery = $state('');
	let users = $state<IUser[]>([]);
	let isSearching = $state(false);
	let error = $state<string | null>(null);

	async function handleSearch() {
		if (searchQuery.length < 2) {
			users = [];
			return;
		}

		isSearching = true;
		error = null;
		try {
			users = await usersApi.searchUsers(searchQuery);
		} catch (err: any) {
			error = 'Failed to search users';
			console.error(err);
		} finally {
			isSearching = false;
		}
	}

	// Reset state when modal opens
	$effect(() => {
		if (isOpen) {
			searchQuery = '';
			users = [];
			error = null;
		}
	});

	// Debounced search
	let timeout: ReturnType<typeof setTimeout>;
	$effect(() => {
		clearTimeout(timeout);
		if (searchQuery) {
			timeout = setTimeout(handleSearch, 300);
		} else {
			users = [];
		}
	});

	async function startChat(userId: string) {
		try {
			await chatsStore.createChat([userId]);
			onClose();
		} catch (err) {
			error = 'Failed to start chat';
		}
	}
</script>

<Modal {isOpen} {onClose} title="New Conversation">
	<div class="new-chat-content">
		<div class="search-input-wrapper">
			<!-- <Search class="search-icon" size={18} /> -->
			<input
				type="text"
				placeholder="Search by username or email..."
				bind:value={searchQuery}
				autofocus
			/>
		</div>

		<div class="results-list">
			{#if isSearching}
				<div class="loading">Searching...</div>
			{:else if error}
				<div class="error">{error}</div>
			{:else if users.length > 0}
				{#each users as user (user._id)}
					<button class="user-item" onclick={() => startChat(user._id)}>
						<div class="avatar-md">
							{user.username[0].toUpperCase()}
						</div>
						<div class="user-info">
							<span class="username">{user.username}</span>
							<span class="email">{user.email}</span>
						</div>
						<ChevronRight class="arrow" />
					</button>
				{/each}
			{:else if searchQuery.length >= 2}
				<div class="empty">No users found</div>
			{/if}
		</div>
	</div>
</Modal>

<style>
	.new-chat-content {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-4);
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: var(--spacing-4);
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-gray-400);
		pointer-events: none;
	}

	.search-input-wrapper input {
		width: 100%;
		padding: var(--spacing-4) var(--spacing-4) var(--spacing-4) var(--spacing-3);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
		background: var(--color-gray-50);
		font-size: var(--font-size-base);
		outline: none;
		transition: all var(--transition-base);
	}

	.search-input-wrapper input:focus {
		background: var(--color-white);
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px var(--color-primary-light);
	}

	.results-list {
		max-height: 300px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.user-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-4);
		padding: var(--spacing-3);
		border: none;
		background: transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: background var(--transition-base);
		text-align: left;
		width: 100%;
	}

	.user-item:hover {
		background: var(--color-gray-50);
	}

	.avatar-md {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-full);
		background: var(--color-primary-light);
		color: var(--color-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-weight-bold);
		flex-shrink: 0;
	}

	.user-info {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.username {
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		font-size: var(--font-size-base);
	}

	.email {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.arrow {
		color: var(--color-gray-300);
		transition: transform var(--transition-base);
	}

	.user-item:hover .arrow {
		transform: translateX(4px);
		color: var(--color-primary);
	}

	.loading,
	.empty,
	.error {
		padding: var(--spacing-8);
		text-align: center;
		color: var(--color-text-muted);
	}

	.error {
		color: var(--color-danger);
	}
</style>
