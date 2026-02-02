<script lang="ts">
	import { onMount } from 'svelte';
	import { Camera, Plus } from './icons';
	import { storiesStore } from '$lib/stores/stories.svelte';
	import { authStore } from '$lib/stores/auth.svelte';

	let { onAddStory } = $props<{ onAddStory: () => void }>();

	const user = $derived(authStore.currentUser);
	const allItems = $derived(storiesStore.items);
	
	// Filter out current user from the main stories list
	const items = $derived(allItems.filter(item => item.user._id !== user?._id));
	
	// Find current user's stories in the full list
	const currentUserStoriesEntry = $derived(allItems.find(item => item.user._id === user?._id));
	const hasStories = $derived((currentUserStoriesEntry?.stories.length || 0) > 0);

	onMount(() => {
		storiesStore.fetchStories();
	});

	function handleStoryClick(index: number) {
		storiesStore.openStories(index);
	}

	function handleOwnStoryClick() {
		if (hasStories) {
			const ownIndex = allItems.findIndex(item => item.user._id === user?._id);
			if (ownIndex !== -1) {
				storiesStore.openStories(ownIndex);
			}
		} else {
			onAddStory();
		}
	}

	const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
</script>

<div class="stories-container">
	<div class="stories-scroll">
		<button 
			class="story-item add-story" 
			class:unseen={currentUserStoriesEntry?.hasUnseen} 
			onclick={handleOwnStoryClick}
		>
			<div class="avatar-wrapper">
				<div class="avatar-placeholder">
					{#if user?.avatar}
						<img src={user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`} alt="Your story" class="avatar-img" />
					{:else if user}
						{user.username[0].toUpperCase()}
					{:else}
						<Camera class="camera-icon" />
					{/if}
				</div>
				<div class="plus-badge" onclick={(e) => { e.stopPropagation(); onAddStory(); }} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && onAddStory()}>
					<Plus />
				</div>
			</div>
			<span class="username">Your story</span>
		</button>

		{#each allItems as userStory, i}
			{#if userStory.user._id !== user?._id}
				<button class="story-item" class:unseen={userStory.hasUnseen} onclick={() => handleStoryClick(i)}>
					<div class="avatar-wrapper">
						<div class="avatar-placeholder">
						{#if userStory.user.avatar}
							<img src={userStory.user.avatar.startsWith('http') ? userStory.user.avatar : `${API_URL}${userStory.user.avatar}`} alt={userStory.user.username} class="avatar-img" />
						{:else}
							{userStory.user.username[0].toUpperCase()}
						{/if}
					</div>
					</div>
					<span class="username">{userStory.user.username}</span>
				</button>
			{/if}
		{/each}
	</div>
</div>

<style>
	.stories-container {
		padding: var(--spacing-3) var(--spacing-4);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-white);
	}

	.stories-scroll {
		display: flex;
		gap: var(--spacing-4);
		overflow-x: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
		padding-bottom: var(--spacing-1);
	}

	.stories-scroll::-webkit-scrollbar {
		display: none;
	}

	.story-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-2);
		background: none;
		border: none;
		cursor: pointer;
		flex-shrink: 0;
		padding: 0;
		width: 64px;
	}

	.avatar-wrapper {
		width: 56px;
		height: 56px;
		position: relative;
		padding: 3px;
		border-radius: var(--radius-full);
		transition: transform var(--transition-base);
	}

	.story-item:hover .avatar-wrapper {
		transform: scale(1.05);
	}

	.unseen .avatar-wrapper {
		background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
	}

	.avatar-placeholder {
		width: 100%;
		height: 100%;
		border-radius: var(--radius-full);
		background: var(--color-gray-100);
		border: 2px solid var(--color-white);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-weight-bold);
		color: var(--color-gray-600);
		font-size: var(--font-size-lg);
	}

	.add-story .avatar-placeholder {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}

	.camera-icon {
		width: 24px;
		height: 24px;
	}

	.plus-badge {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 20px;
		height: 20px;
		background: var(--color-primary);
		color: var(--color-white);
		border-radius: var(--radius-full);
		border: 2px solid var(--color-white);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
	}

	.username {
		font-size: 11px;
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		width: 100%;
		text-align: center;
	}

	.unseen .username {
		color: var(--color-text-primary);
		font-weight: var(--font-weight-medium);
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		border-radius: var(--radius-full);
		object-fit: cover;
	}
</style>
