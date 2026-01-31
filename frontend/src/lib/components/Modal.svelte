<script lang="ts">
	interface Props {
		isOpen: boolean;
		onClose: () => void;
		title: string;
		children?: import('svelte').Snippet;
	}

	let { isOpen = $bindable(), onClose, title, children }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

{#if isOpen}
	<div
		class="modal-backdrop"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="button"
		tabindex="-1"
	>
		<div class="modal-container">
			<header class="modal-header">
				<h3>{title}</h3>
				<button class="close-btn" onclick={onClose} aria-label="Close modal">
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
						><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"
						></line></svg
					>
				</button>
			</header>
			<div class="modal-content">
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: var(--z-modal);
		padding: var(--spacing-4);
	}

	.modal-container {
		background: var(--color-white);
		border-radius: var(--radius-xl);
		width: 100%;
		max-width: 500px;
		box-shadow: var(--shadow-lg);
		animation: modal-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		overflow: hidden;
	}

	@keyframes modal-in {
		from {
			transform: scale(0.9) translateY(20px);
			opacity: 0;
		}
		to {
			transform: scale(1) translateY(0);
			opacity: 1;
		}
	}

	.modal-header {
		padding: var(--spacing-4) var(--spacing-6);
		border-bottom: 1px solid var(--color-border);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--color-gray-50);
	}

	.modal-header h3 {
		margin: 0;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--color-gray-400);
		cursor: pointer;
		padding: var(--spacing-1);
		border-radius: var(--radius-full);
		transition: all var(--transition-base);
		display: flex;
	}

	.close-btn:hover {
		color: var(--color-danger);
		background: var(--color-danger-light);
	}

	.modal-content {
		padding: var(--spacing-6);
	}
</style>
