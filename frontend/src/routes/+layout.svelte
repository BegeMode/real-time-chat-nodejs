<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/variables.css';
	import { onMount } from 'svelte';
	import { authApi } from '$lib/api/auth';

	let { children } = $props();
	let isInitialized = $state(false);

	// Initialize authorization when the application loads
	onMount(async () => {
		// Check if there is a token and load user data
		await authApi.initialize();
		isInitialized = true;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isInitialized}
	{@render children()}
{:else}
	<div class="loading-screen">
		<div class="loading-spinner"></div>
	</div>
{/if}

<style>
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
