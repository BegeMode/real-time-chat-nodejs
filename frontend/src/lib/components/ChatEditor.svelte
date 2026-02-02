<script lang="ts">
	import { Paperclip, Smile, Send } from './icons';
	import { onDestroy } from 'svelte';
	import Spinner from './Spinner.svelte';

	interface Props {
		onSend: (content: string) => Promise<void> | void;
		onTyping?: (isTyping: boolean) => void;
	}

	let { onSend, onTyping }: Props = $props();
	let content = $state('');
	let isTyping = $state(false);
	let isSending = $state(false);
	let typingTimeout: ReturnType<typeof setTimeout> | null = null;

	function handleInput() {
		if (!isTyping) {
			isTyping = true;
			onTyping?.(true);
		}

		if (typingTimeout) {
			clearTimeout(typingTimeout);
		}

		typingTimeout = setTimeout(() => {
			isTyping = false;
			onTyping?.(false);
		}, 3000);
	}

	onDestroy(() => {
		if (isTyping) {
			onTyping?.(false);
		}
		if (typingTimeout) {
			clearTimeout(typingTimeout);
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (content.trim() && !isSending) {
			const messageToSend = content;
			isSending = true;
			try {
				await onSend(messageToSend);
				content = '';
				if (isTyping) {
					isTyping = false;
					onTyping?.(false);
					if (typingTimeout) {
						clearTimeout(typingTimeout);
					}
				}
			} catch (err) {
				console.error('Failed to send message:', err);
			} finally {
				isSending = false;
			}
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	}
</script>

<div class="editor-container">
	<form class="editor-form" onsubmit={handleSubmit}>
		<button type="button" class="action-btn" aria-label="Attach file">
			<Paperclip />
		</button>

		<div class="input-wrapper">
			<textarea
				bind:value={content}
				onkeydown={handleKeydown}
				oninput={handleInput}
				placeholder="Type a message..."
				rows="1"
			></textarea>
		</div>

		<button type="button" class="action-btn" aria-label="Emoji">
			<Smile />
		</button>

		<button 
			type="submit" 
			class="send-btn" 
			disabled={!content.trim() || isSending} 
			aria-label="Send message"
		>
			{#if isSending}
				<Spinner size="xs" color="white" />
			{:else}
				<Send />
			{/if}
		</button>
	</form>
</div>

<style>
	.editor-container {
		padding: var(--spacing-4) var(--spacing-6);
		background: var(--color-white);
		border-top: 1px solid var(--color-border);
	}

	.editor-form {
		display: flex;
		align-items: flex-end;
		gap: var(--spacing-2);
		max-width: 800px;
		margin: 0 auto;
	}

	.input-wrapper {
		flex: 1;
		background: var(--color-gray-50);
		border-radius: var(--radius-xl);
		padding: var(--spacing-2) var(--spacing-4);
		border: 1px solid var(--color-border);
		transition: all var(--transition-base);
	}

	.input-wrapper:focus-within {
		background: var(--color-white);
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px var(--color-primary-light);
	}

	textarea {
		width: 100%;
		border: none;
		background: transparent;
		resize: none;
		font-family: inherit;
		font-size: var(--font-size-base);
		padding: var(--spacing-1) 0;
		outline: none;
		max-height: 150px;
	}

	.action-btn {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: var(--color-gray-500);
		cursor: pointer;
		border-radius: var(--radius-full);
		transition: all var(--transition-base);
		margin-bottom: 2px;
	}

	.action-btn:hover {
		background: var(--color-gray-100);
		color: var(--color-primary);
	}

	.send-btn {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-primary);
		color: var(--color-white);
		border: none;
		cursor: pointer;
		border-radius: var(--radius-full);
		transition: all var(--transition-base);
		margin-bottom: 2px;
	}

	.send-btn:hover:not(:disabled) {
		background: var(--color-primary-hover);
		transform: scale(1.05);
	}

	.send-btn:disabled {
		background: var(--color-gray-300);
		cursor: not-allowed;
	}
</style>
