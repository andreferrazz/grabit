<script lang="ts">
	import { sync } from '$lib/stores/sync.svelte';

	const label = $derived(
		sync.status === 'saving'
			? 'Saving…'
			: sync.status === 'error'
				? 'Sync failed'
				: sync.status === 'saved'
					? 'Saved'
					: ''
	);

	const dotClass = $derived(
		sync.status === 'saving'
			? 'bg-amber-400 animate-pulse'
			: sync.status === 'error'
				? 'bg-red-500'
				: sync.status === 'saved'
					? 'bg-brand-500'
					: 'bg-ink-subtle'
	);
</script>

{#if label}
	<span
		class="inline-flex items-center gap-1.5 text-xs font-medium tabular-nums text-ink-muted"
		role="status"
		aria-live="polite"
	>
		<span class="size-2 rounded-full {dotClass}" aria-hidden="true"></span>
		<span>{label}</span>
	</span>
{/if}
