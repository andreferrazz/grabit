<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconName } from './Icon.svelte';

	let { icon, title, children }: { icon: IconName; title: string; children?: Snippet } = $props();
</script>

<div
	class="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-12 text-center"
>
	<span class="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
		<Icon name={icon} class="size-6" />
	</span>
	<h2 class="mt-4 text-base font-semibold text-ink">{title}</h2>
	{#if children}
		<div class="mt-1 max-w-sm text-sm text-ink-muted">{@render children()}</div>
	{/if}
</div>
