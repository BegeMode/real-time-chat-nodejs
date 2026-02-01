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
	<line x1="22" y1="2" x2="11" y2="13"></line>
	<polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
</Icon>
