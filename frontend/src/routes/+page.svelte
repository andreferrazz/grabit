<script lang="ts">
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ListCard from '$lib/components/ListCard.svelte';
	import { shopping } from '$lib/stores/shopping.svelte';

	let newName = $state('');
	let creating = $state(false);

	const sortedLists = $derived(
		[...shopping.lists].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
	);

	async function handleCreate(event: Event) {
		event.preventDefault();
		const name = newName.trim();
		if (!name || creating) return;
		creating = true;
		const promise = shopping.createList(name);
		newName = '';
		await promise;
		creating = false;
	}
</script>

<section class="space-y-6">
	<div class="space-y-2">
		<h1 class="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Your lists</h1>
		<p class="text-sm text-ink-muted">Simple shopping lists for everyday buying.</p>
	</div>

	<form
		onsubmit={handleCreate}
		class="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:p-5"
	>
		<label for="new-list-name" class="sr-only">New list name</label>
		<input
			id="new-list-name"
			type="text"
			bind:value={newName}
			placeholder="e.g. Groceries"
			maxlength="200"
			class="flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-ink outline-none placeholder:text-ink-subtle focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
			required
		/>
		<button
			type="submit"
			disabled={!newName.trim() || creating}
			class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-surface transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.4"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="size-4"
				aria-hidden="true"
			>
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
			Add list
		</button>
	</form>

	{#if sortedLists.length === 0}
		<EmptyState
			title="No lists yet"
			description="Create your first shopping list above to get started."
		/>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2">
			{#each sortedLists as list (list.id)}
				<ListCard {list} />
			{/each}
		</div>
	{/if}
</section>
