<script lang="ts">
	let { name, size = 20 }: { name: string; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
	{#if name === 'paw'}
		<path d="M6 17c0-2 2-3 3-5 1-2 5-2 6 0 1 2 3 3 3 5 0 3-3 4-6 2-3 2-6 1-6-2Z" fill="currentColor" stroke="none" />
		<ellipse cx="5" cy="9" rx="2" ry="2.6" fill="currentColor" stroke="none" transform="rotate(-25 5 9)" />
		<ellipse cx="10" cy="5.5" rx="2" ry="2.7" fill="currentColor" stroke="none" />
		<ellipse cx="15.2" cy="5.8" rx="2" ry="2.7" fill="currentColor" stroke="none" transform="rotate(15 15.2 5.8)" />
		<ellipse cx="20" cy="10" rx="1.9" ry="2.5" fill="currentColor" stroke="none" transform="rotate(28 20 10)" />
	{:else if name === 'sun'}
		<circle cx="12" cy="12" r="3.5" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
	{:else if name === 'moon'}
		<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" />
	{:else if name === 'sound' || name === 'muted'}
		<path d="M4 9h4l5-4v14l-5-4H4Z" />
		{#if name === 'sound'}<path d="M16 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14" />{:else}<path d="m17 9 5 6m0-6-5 6" />{/if}
	{:else if name === 'rotate' || name === 'reset'}<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" />
	{:else if name === 'plus'}<path d="M12 5v14M5 12h14" />
	{:else if name === 'minus'}<path d="M5 12h14" />
	{:else if name === 'arrow'}<path d="M4 12h15m-5-5 5 5-5 5" />
	{:else if name === 'download'}<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4" />
	{:else if name === 'pin'}<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" />
	{:else if name === 'leaf'}<path d="M19 4C6 2 2 11 7 16s14 1 12-12ZM5 20 15 9" />
	{:else if name === 'pause'}<path d="M8 5v14M16 5v14" stroke-width="3" />
	{:else if name === 'play'}<path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none" />
	{:else if name === 'check'}<path d="m5 12 4 4L19 6" stroke-width="2.4" />
	{:else if name === 'bell'}<path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4Zm5 3h4M12 2v2" />
	{:else if name === 'clock'}<circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" />
	{:else if name === 'star'}<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />
	{:else if name === 'close'}<path d="m6 6 12 12M18 6 6 18" />
	{:else if name === 'compass'}<circle cx="12" cy="12" r="9" /><path d="m16 8-2 6-6 2 2-6Z" />
	{/if}
</svg>
