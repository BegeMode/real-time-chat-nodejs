<script lang="ts">
	import { activeChat } from '$lib/stores/chats';
	import { currentUser } from '$lib/stores/auth';
	import ChatEditor from './ChatEditor.svelte';
	import { onMount, tick } from 'svelte';

	const chat = $derived($activeChat);
	const user = $derived($currentUser);
	const otherMember = $derived(chat?.members.find((m) => m.user._id !== user?._id));

	let scrollContainer = $state<HTMLDivElement>();

	// Mock messages for now until we have real ones in the store/api
	let messages = $state([
		{
			_id: '1',
			content: 'Hey there!',
			sender: { _id: 'other', username: 'John' },
			createdAt: new Date().toISOString()
		},
		{
			_id: '2',
			content: 'Hi! How are you?',
			sender: { _id: 'me', username: 'Me' },
			createdAt: new Date().toISOString()
		}
	]);

	async function scrollToBottom() {
		await tick();
		if (scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	}

	$effect(() => {
		if (chat) {
			scrollToBottom();
		}
	});

	function handleSendMessage(content: string) {
		console.log('Sending message:', content);
		// TODO: Implement actual sending
		messages = [
			...messages,
			{
				_id: Math.random().toString(),
				content,
				sender: { _id: user?._id || 'me', username: user?.username || 'Me' },
				createdAt: new Date().toISOString()
			}
		];
		scrollToBottom();
	}
</script>

<main class="chat-window">
	{#if chat}
		<header class="chat-header">
			<div class="header-content">
				<div class="avatar">
					{otherMember?.user.username[0].toUpperCase() || '?'}
				</div>
				<div class="header-info">
					<h3>{otherMember?.user.username || 'Chat'}</h3>
					<span class="status" class:online={otherMember?.user.isOnline}>
						{otherMember?.user.isOnline ? 'Online' : 'Offline'}
					</span>
				</div>
			</div>
			<div class="header-actions">
				<button class="icon-btn" aria-label="Call">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path
							d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
						></path></svg
					>
				</button>
				<button class="icon-btn" aria-label="More">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle
							cx="12"
							cy="19"
							r="1"
						></circle></svg
					>
				</button>
			</div>
		</header>

		<div class="messages-container" bind:this={scrollContainer}>
			<div class="messages-list">
				{#each messages as msg (msg._id)}
					{@const isMe = msg.sender._id === user?._id || msg.sender._id === 'me'}
					<div class="message-wrapper" class:me={isMe}>
						<div class="message-bubble">
							<div class="message-content">{msg.content}</div>
							<div class="message-time">
								{new Date(msg.createdAt).toLocaleTimeString([], {
									hour: '2-digit',
									minute: '2-digit'
								})}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<ChatEditor onSend={handleSendMessage} />
	{:else}
		<div class="no-chat-selected">
			<div class="empty-icon">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="64"
					height="64"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg
				>
			</div>
			<h2>Select a chat to start messaging</h2>
			<p>Choose from your existing chats or start a new one.</p>
		</div>
	{/if}
</main>

<style>
	.chat-window {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: var(--color-chat-bg);
		height: 100%;
		position: relative;
	}

	.chat-header {
		height: var(--header-height);
		background: var(--glass-bg);
		backdrop-filter: var(--glass-blur);
		border-bottom: 1px solid var(--color-border);
		padding: 0 var(--spacing-6);
		display: flex;
		align-items: center;
		gap: var(--spacing-4);
		z-index: 5;
		justify-content: space-between;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: var(--spacing-4);
	}

	.avatar {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
		background: var(--color-primary);
		color: var(--color-white);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-weight-bold);
	}

	.header-info {
		flex: 1;
	}

	.header-info h3 {
		margin: 0;
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
	}

	.status {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.status.online {
		color: var(--color-success);
	}

	.header-actions {
		display: flex;
		gap: var(--spacing-2);
	}

	.icon-btn {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-md);
		border: none;
		background: transparent;
		color: var(--color-gray-500);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all var(--transition-base);
	}

	.icon-btn:hover {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}

	.messages-container {
		flex: 1;
		overflow-y: auto;
		padding: var(--spacing-6);
		display: flex;
		flex-direction: column;
	}

	.messages-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-4);
		max-width: 800px;
		width: 100%;
		margin: 0 auto;
	}

	.message-wrapper {
		display: flex;
		width: 100%;
	}

	.message-wrapper.me {
		justify-content: flex-end;
	}

	.message-bubble {
		max-width: 70%;
		padding: var(--spacing-3) var(--spacing-4);
		border-radius: var(--radius-xl);
		position: relative;
		box-shadow: var(--shadow-sm);
	}

	.me .message-bubble {
		background: var(--color-bubble-me);
		color: var(--color-bubble-me-text);
		border-bottom-right-radius: var(--radius-sm);
	}

	.message-wrapper:not(.me) .message-bubble {
		background: var(--color-bubble-other);
		color: var(--color-bubble-other-text);
		border-bottom-left-radius: var(--radius-sm);
	}

	.message-time {
		font-size: 10px;
		margin-top: 4px;
		text-align: right;
		opacity: 0.7;
	}

	.no-chat-selected {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
		text-align: center;
		padding: var(--spacing-10);
	}

	.empty-icon {
		margin-bottom: var(--spacing-6);
		color: var(--color-gray-300);
	}

	.no-chat-selected h2 {
		color: var(--color-text-primary);
		margin-bottom: var(--spacing-2);
	}
</style>
