<script lang="ts">
	import { chatsStore } from '$lib/stores/chats.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { messagesStore } from '$lib/stores/messages.svelte';
	import { socketStore } from '$lib/stores/socket.svelte';
	import { SocketEvents, type IUser } from '@shared/index';
	import ChatEditor from './ChatEditor.svelte';
	import { Phone, MoreVertical, MessageSquare } from './icons';
	import { tick } from 'svelte';

	// Use $derived to reactively access store class properties
	const chat = $derived(chatsStore.activeChat);
	const user = $derived(authStore.currentUser);
	const otherMember = $derived(chat?.members.find((m) => m.user._id !== user?._id));

	// Access typing users directly from the store
	const typingIds = $derived(chatsStore.getTypingUsers(chat?._id || ''));

	const otherTypingUsers = $derived.by(() => {
		if (!chat) return [];
		return typingIds
			.filter((id) => id !== user?._id)
			.map((userId) => chat.members.find((m) => m.user._id === userId)?.user)
			.filter(Boolean) as IUser[];
	});

	// Auto-scroll when indicator appears
	$effect(() => {
		if (otherTypingUsers.length > 0) {
			scrollToBottom();
		}
	});

	let scrollContainer = $state<HTMLDivElement>();
	let hiddenItem = $state<HTMLDivElement>();

	// Access messages through store methods
	const chatMessages = $derived(messagesStore.getMessages(chat?._id || ''));
	const isLoading = $derived(messagesStore.isLoadingChat(chat?._id || ''));
	const hasMore = $derived(messagesStore.hasMoreMessages(chat?._id || ''));

	let lastMessageId = $state<string | null>(null);
	let previousScrollHeight = 0;

	async function scrollToBottom() {
		await tick();
		if (scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	}

	function handleHiddenItemIntersection(entries: IntersectionObserverEntry[]) {
		const entry = entries[0];
		if (entry.isIntersecting && hasMore && !isLoading && chat?._id) {
			if (scrollContainer) {
				previousScrollHeight = scrollContainer.scrollHeight;
			}
			messagesStore.loadMore(chat._id);
		}
	}

	let lastProcessedChatId = $state<string | null>(null);
	$effect(() => {
		const chatId = chat?._id;
		if (chatId && chatId !== lastProcessedChatId) {
			lastProcessedChatId = chatId;
			lastMessageId = null;
			previousScrollHeight = 0;
			messagesStore.loadMessages(chatId);
		}
	});

	// Handle scroll positioning: scroll to bottom only when NEW messages arrive at the end
	$effect(() => {
		if (chatMessages.length && !isLoading && scrollContainer) {
			const currentLastId = chatMessages[chatMessages.length - 1]?._id;

			if (previousScrollHeight > 0) {
				// History loaded: preserve position by adjusting scroll
				const newScrollHeight = scrollContainer.scrollHeight;
				const heightDifference = newScrollHeight - previousScrollHeight;
				if (heightDifference > 0) {
					scrollContainer.scrollTop += heightDifference;
				}
				previousScrollHeight = 0;
				// Sync lastMessageId to prevent scrollToBottom trigger
				lastMessageId = currentLastId;
			} else if (currentLastId !== lastMessageId) {
				// New message or initial load: scroll to bottom
				scrollToBottom();
				lastMessageId = currentLastId;
			}
		}
	});

	$effect(() => {
		if (hiddenItem) {
			const observer = new IntersectionObserver(handleHiddenItemIntersection, {
				root: scrollContainer,
				threshold: 0.1
			});
			observer.observe(hiddenItem);
			return () => observer.disconnect();
		}
	});

	function handleSendMessage(content: string) {
		if (chat?._id) {
			messagesStore.sendMessage(chat._id, content);
			scrollToBottom();
		}
	}

	function handleTyping(isTyping: boolean) {
		if (chat?._id) {
			socketStore.emit(isTyping ? SocketEvents.TYPING_START : SocketEvents.TYPING_STOP, {
				chatId: chat._id
			});
		}
	}

	function isDateItem(item: any): item is import('$lib/stores/messages.svelte').IDateItem {
		return item && item.type === 'date';
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
					<Phone />
				</button>
				<button class="icon-btn" aria-label="More">
					<MoreVertical />
				</button>
			</div>
		</header>

		<div class="messages-container" bind:this={scrollContainer}>
			<div class="messages-list">
				{#if hasMore}
					<div bind:this={hiddenItem} class="hidden-item">
						{#if isLoading}
							<div class="loading-more">Loading earlier messages...</div>
						{/if}
					</div>
				{/if}

				{#if isLoading && chatMessages.length === 0}
					<div class="loading-messages">Loading messages...</div>
				{/if}
				{#each chatMessages as item (item._id)}
					{#if isDateItem(item)}
						<div class="date-separator">
							<span>{item.text}</span>
						</div>
					{:else}
						{@const msg = item}
						{@const senderId = typeof msg.senderId === 'string' ? msg.senderId : msg.senderId?._id}
						{@const isMe = senderId === user?._id}
						<div class="message-wrapper" class:me={isMe}>
							<div class="message-bubble">
								<div class="message-content">{msg.text}</div>
								<div class="message-time">
									{new Date(msg.createdAt).toLocaleTimeString([], {
										hour: '2-digit',
										minute: '2-digit'
									})}
								</div>
							</div>
						</div>
					{/if}
				{/each}
				{#if otherTypingUsers.length > 0}
					<div class="typing-indicator">
						<div class="dots">
							<span></span>
							<span></span>
							<span></span>
						</div>
						<span class="typing-text">
							{otherTypingUsers.length === 1
								? `${otherTypingUsers[0].username} is typing...`
								: `${otherTypingUsers.length} people are typing...`}
						</span>
					</div>
				{/if}
			</div>
		</div>

		{#key chat._id}
			<ChatEditor onSend={handleSendMessage} onTyping={handleTyping} />
		{/key}
	{:else}
		<div class="no-chat-selected">
			<div class="empty-icon">
				<MessageSquare />
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

	.date-separator {
		display: flex;
		align-items: center;
		justify-content: center;
		margin: var(--spacing-4) 0;
		position: relative;
	}

	.date-separator::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		background: var(--color-border);
		z-index: 1;
	}

	.date-separator span {
		background: var(--color-chat-bg);
		padding: 0 var(--spacing-4);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-weight: var(--font-weight-medium);
		position: relative;
		z-index: 2;
	}

	.hidden-item {
		height: 10px;
		width: 100%;
	}

	.loading-more {
		text-align: center;
		padding: var(--spacing-2);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
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

	.typing-indicator {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
		padding: var(--spacing-1) var(--spacing-2);
		margin-bottom: var(--spacing-2);
	}

	.dots {
		display: flex;
		gap: 3px;
	}

	.dots span {
		width: 6px;
		height: 6px;
		background: var(--color-gray-400);
		border-radius: 50%;
		animation: bounce 1.4s infinite ease-in-out both;
	}

	.dots span:nth-child(1) {
		animation-delay: -0.32s;
	}
	.dots span:nth-child(2) {
		animation-delay: -0.16s;
	}

	@keyframes bounce {
		0%,
		80%,
		100% {
			transform: scale(0);
		}
		40% {
			transform: scale(1);
		}
	}

	.typing-text {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-style: italic;
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
