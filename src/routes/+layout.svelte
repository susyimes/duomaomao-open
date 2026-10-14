<script lang="ts">
	import './layout.css';
	import { locale } from '$lib/duomaomao/i18n';
	$effect(() => { document.documentElement.lang = $locale; });

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href="/assets/icons/paw.svg" /></svelte:head>
{@render children()}
