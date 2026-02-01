<script lang="ts">
	import Icon from './Icon.svelte';
	interface Props {
		size?: number | string;
		color?: string;
		strokeWidth?: number | string;
		class?: string;
	}
	let { size = 16, color, strokeWidth, class: className }: Props = $props();
</script>

<Icon {size} {color} {strokeWidth} class={className}>
	<circle cx="11" cy="11" r="8"></circle>
	<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
</Icon>
