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
	<line x1="12" y1="5" x2="12" y2="19"></line>
	<line x1="5" y1="12" x2="19" y2="12"></line>
</Icon>
