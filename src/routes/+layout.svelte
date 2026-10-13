<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href="/assets/icons/paw.svg" /></svelte:head>
{@render children()}
