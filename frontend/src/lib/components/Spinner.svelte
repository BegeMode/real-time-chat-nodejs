<script lang="ts">
	interface Props {
		size?: 'xs' | 'sm' | 'md' | 'lg';
		color?: 'white' | 'primary';
		class?: string;
	}

	let { size = 'md', color = 'primary', class: className = '' }: Props = $props();

	const sizeMap = {
		xs: '16px',
		sm: '24px',
		md: '40px',
		lg: '64px'
	};
</script>

<div
	class="spinner {color} {className}"
	style="width: {sizeMap[size]}; height: {sizeMap[size]};"
	role="status"
></div>

<style>
	.spinner {
		border-radius: 50%;
		border: 2px solid rgba(0, 0, 0, 0.1);
		animation: spin 0.8s linear infinite;
	}

	.primary {
		border-top-color: var(--color-primary);
	}

	.white {
		border-color: rgba(255, 255, 255, 0.3);
		border-top-color: #fff;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
