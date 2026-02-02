<script lang="ts">
	import { toastStore } from '$lib/stores/toasts.svelte';
	import { X } from './icons';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';

	const toasts = $derived(toastStore.toasts);
</script>

<div class="toast-container">
	{#each toasts as toast (toast.id)}
		<div
			class="toast {toast.type}"
			animate:flip={{ duration: 300 }}
			in:fly={{ y: 20, opacity: 0, duration: 400 }}
			out:fly={{ x: 100, opacity: 0, duration: 300 }}
		>
			<div class="toast-content">
				<span class="message">{toast.message}</span>
				<button class="close-btn" onclick={() => toastStore.remove(toast.id)}>
					<X />
				</button>
			</div>
			{#if toast.duration && toast.duration > 0}
				<div 
					class="progress-bar" 
					style="animation-duration: {toast.duration}ms"
				></div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: var(--spacing-6);
		right: var(--spacing-6);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
		z-index: var(--z-toast);
		pointer-events: none;
		max-width: 400px;
		width: calc(100vw - var(--spacing-12));
	}

	.toast {
		pointer-events: auto;
		background: var(--color-white);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		position: relative;
		border: 1px solid var(--color-border);
		backdrop-filter: blur(10px);
	}

	.toast-content {
		padding: var(--spacing-4) var(--spacing-5);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-4);
	}

	.message {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
		line-height: normal;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--color-gray-400);
		cursor: pointer;
		padding: 2px;
		display: flex;
		transition: color 0.2s;
	}

	.close-btn:hover {
		color: var(--color-gray-600);
	}

	/* Type styles */
	.success { border-left: 4px solid var(--color-success); }
	.error { border-left: 4px solid var(--color-danger); }
	.warning { border-left: 4px solid #f59e0b; }
	.info { border-left: 4px solid var(--color-primary); }

	.progress-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		height: 3px;
		background: rgba(0, 0, 0, 0.05);
		width: 100%;
		transform-origin: left;
		animation: shrink linear forwards;
	}

	.success .progress-bar { background: var(--color-success); opacity: 0.2; }
	.error .progress-bar { background: var(--color-danger); opacity: 0.2; }
	.warning .progress-bar { background: #f59e0b; opacity: 0.2; }
	.info .progress-bar { background: var(--color-primary); opacity: 0.2; }

	@keyframes shrink {
		from { transform: scaleX(1); }
		to { transform: scaleX(0); }
	}
</style>
