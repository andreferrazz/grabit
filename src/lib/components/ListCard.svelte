<script lang="ts">
	import Progress from './Progress.svelte';

	let { list }: { list: { id: string; name: string; itemCount: number; checkedCount: number } } =
		$props();

	const allDone = $derived(list.itemCount > 0 && list.checkedCount === list.itemCount);
</script>

<a
	href="/lists/{list.id}"
	class="card block p-4 transition hover:border-brand focus-visible:border-brand active:scale-[0.99]"
>
	<div class="flex items-baseline justify-between gap-3">
		<h2 class="truncate text-base font-semibold text-ink">{list.name}</h2>
		<span
			class={[
				'shrink-0 text-sm tabular-nums',
				allDone ? 'font-medium text-brand' : 'text-ink-muted'
			]}
		>
			{#if list.itemCount === 0}
				No items
			{:else if allDone}
				All done
			{:else}
				{list.checkedCount} of {list.itemCount}
			{/if}
		</span>
	</div>
	<div class="mt-3">
		<Progress value={list.checkedCount} max={list.itemCount} label="Progress of {list.name}" />
	</div>
</a>
