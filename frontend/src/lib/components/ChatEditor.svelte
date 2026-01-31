<script lang="ts">
	interface Props {
		onSend: (content: string) => void;
	}

	let { onSend }: Props = $props();
	let content = $state('');

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (content.trim()) {
			onSend(content);
			content = '';
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
					d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
				></path></svg
			>
		</button>

		<div class="input-wrapper">
			<textarea
				bind:value={content}
				onkeydown={handleKeydown}
				placeholder="Type a message..."
				rows="1"
			></textarea>
		</div>

		<button type="button" class="action-btn" aria-label="Emoji">
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
				><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line
					x1="9"
					y1="9"
					x2="9.01"
					y2="9"
				></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg
			>
		</button>

		<button type="submit" class="send-btn" disabled={!content.trim()} aria-label="Send message">
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
				><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"
				></polygon></svg
			>
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
