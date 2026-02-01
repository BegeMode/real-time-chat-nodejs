<script lang="ts">
	import Icon from './Icon.svelte';
	interface Props {
		size?: number | string;
		color?: string;
		strokeWidth?: number | string;
		class?: string;
	}
	let { size = 20, color, strokeWidth, class: className }: Props = $props();
</script>

<Icon {size} {color} {strokeWidth} class={className}>
	<circle cx="12" cy="12" r="10"></circle>
	<path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
	<line x1="9" y1="9" x2="9.01" y2="9"></line>
	<line x1="15" y1="9" x2="15.01" y2="9"></line>
</Icon>
