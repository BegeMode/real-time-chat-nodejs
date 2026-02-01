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
	<circle cx="12" cy="12" r="1"></circle>
	<circle cx="12" cy="5" r="1"></circle>
	<circle cx="12" cy="19" r="1"></circle>
</Icon>
