<script lang="ts">
	import { chatsStore } from '$lib/stores/chats.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import NewChatModal from './NewChatModal.svelte';
	import StoriesBar from './StoriesBar.svelte';
	import Modal from './Modal.svelte';
	import StoryRecorder from './StoryRecorder.svelte';
	import { storiesStore } from '$lib/stores/stories.svelte';
	import { Plus, Search } from './icons';

	// Access store properties directly using $derived
	const items = $derived(chatsStore.items);
	const activeChatId = $derived(chatsStore.activeChatId);
	const isLoading = $derived(chatsStore.isLoading);
	const user = $derived(authStore.currentUser);

	let isNewChatModalOpen = $state(false);
	let isRecordingModalOpen = $state(false);

	function selectChat(id: string) {
		chatsStore.setActiveChat(id);
	}

	function handleAddChat() {
		isNewChatModalOpen = true;
	}

	function handleAddStory() {
		isRecordingModalOpen = true;
	}

	function handleSaveStory(blob: Blob, duration: number) {
		storiesStore.uploadStory(blob, duration);
		isRecordingModalOpen = false;
	}

	function formatTime(date: Date | string) {
		const d = new Date(date);
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<NewChatModal bind:isOpen={isNewChatModalOpen} onClose={() => (isNewChatModalOpen = false)} />

<Modal
	bind:isOpen={isRecordingModalOpen}
	onClose={() => (isRecordingModalOpen = false)}
	title="Record Story"
>
	<StoryRecorder
		onSave={handleSaveStory}
		onCancel={() => (isRecordingModalOpen = false)}
	/>
</Modal>

<aside class="sidebar">
	<div class="sidebar-header">
		<h2>Chats</h2>
		<button class="add-btn" onclick={handleAddChat} aria-label="Add new chat">
			<Plus />
		</button>
	</div>

	<StoriesBar onAddStory={handleAddStory} />

	<div class="search-container">
		<div class="search-wrapper">
			<Search class="search-icon" />
			<input type="text" placeholder="Search chats..." />
		</div>
	</div>

	<div class="chat-list">
		{#if isLoading}
			<div class="loading">Loading chats...</div>
		{:else if items.length === 0}
			<div class="empty-state">No chats found</div>
		{:else}
			{#each items as chat (chat._id)}
				{@const otherMember = chat.members.find((m) => m.user._id !== user?._id)}
				<button
					class="chat-item"
					class:active={activeChatId === chat._id}
					onclick={() => selectChat(chat._id)}
				>
					<div class="avatar">
						{otherMember?.user.username[0].toUpperCase() || '?'}
						{#if otherMember?.user.isOnline}
							<span class="online-indicator"></span>
						{/if}
					</div>
					<div class="chat-info">
						<div class="chat-name-row">
							<span class="chat-name">{otherMember?.user.username || 'Unknown'}</span>
							<span class="chat-time">{formatTime(chat.updatedAt)}</span>
						</div>
						<div class="chat-preview">
							{chat.lastMessage?.text || 'No messages yet'}
						</div>
					</div>
				</button>
			{/each}
		{/if}
	</div>
</aside>

<style>
	.sidebar {
		width: var(--sidebar-width);
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--color-sidebar-bg);
		border-right: 1px solid var(--color-border);
		z-index: 10;
	}

	.sidebar-header {
		padding: var(--spacing-4) var(--spacing-5);
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--color-border);
	}

	.sidebar-header h2 {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		margin: 0;
	}

	.add-btn {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-full);
		border: none;
		background: var(--color-primary-light);
		color: var(--color-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all var(--transition-base);
	}

	.add-btn:hover {
		background: var(--color-primary);
		color: var(--color-white);
		transform: scale(1.05);
	}

	.search-container {
		padding: var(--spacing-3) var(--spacing-5);
	}

	.search-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: var(--spacing-3);
		color: var(--color-gray-400);
	}

	.search-wrapper input {
		width: 100%;
		padding: var(--spacing-2) var(--spacing-3) var(--spacing-2) var(--spacing-10);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
		background: var(--color-gray-50);
		font-size: var(--font-size-sm);
		outline: none;
		transition: all var(--transition-base);
	}

	.search-wrapper input:focus {
		background: var(--color-white);
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px var(--color-primary-light);
	}

	.chat-list {
		flex: 1;
		overflow-y: auto;
		padding: var(--spacing-2);
	}

	.chat-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
		padding: var(--spacing-3);
		border: none;
		background: transparent;
		border-radius: var(--radius-lg);
		cursor: pointer;
		transition: all var(--transition-base);
		text-align: left;
		margin-bottom: var(--spacing-1);
	}

	.chat-item:hover {
		background: var(--color-gray-50);
	}

	.chat-item.active {
		background: var(--color-primary-light);
	}

	.avatar {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-full);
		background: var(--color-gray-200);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-weight-bold);
		color: var(--color-gray-600);
		position: relative;
		flex-shrink: 0;
	}

	.online-indicator {
		position: absolute;
		bottom: 2px;
		right: 2px;
		width: 12px;
		height: 12px;
		background: var(--color-success);
		border: 2px solid var(--color-white);
		border-radius: 50%;
	}

	.chat-info {
		flex: 1;
		min-width: 0;
	}

	.chat-name-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2px;
	}

	.chat-name {
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chat-time {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.chat-preview {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.loading,
	.empty-state {
		padding: var(--spacing-10);
		text-align: center;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}
</style>
