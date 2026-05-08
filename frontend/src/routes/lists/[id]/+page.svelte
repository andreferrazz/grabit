<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ItemRow from '$lib/components/ItemRow.svelte';
	import { shopping } from '$lib/stores/shopping.svelte';

	const list = $derived(shopping.lists.find((l) => l.id === page.params.id));

	let renaming = $state(false);
	let pendingName = $state('');

	let newItemName = $state('');
	let adding = $state(false);

	const sortedItems = $derived(
		list ? [...list.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : []
	);

	function startRename() {
		if (!list) return;
		pendingName = list.name;
		renaming = true;
	}

	function cancelRename() {
		renaming = false;
	}

	async function commitRename(event: Event) {
		event.preventDefault();
		if (!list) return;
		const next = pendingName.trim();
		if (next && next !== list.name) {
			await shopping.renameList(list.id, next);
		}
		renaming = false;
	}

	async function handleAddItem(event: Event) {
		event.preventDefault();
		if (!list) return;
		const name = newItemName.trim();
		if (!name || adding) return;
		adding = true;
		const promise = shopping.addItem(list.id, name);
		newItemName = '';
		await promise;
		adding = false;
	}

	async function handleDeleteList() {
		if (!list) return;
		if (confirm(`Delete "${list.name}" and all its items?`)) {
			await shopping.deleteList(list.id);
			goto('/');
		}
	}
</script>

{#if !list}
	{#if shopping.hydrated}
		<section class="space-y-4 text-center">
			<h1 class="text-2xl font-semibold text-ink">List not found</h1>
			<p class="text-sm text-ink-muted">
				This list might have been deleted, or the link is incorrect.
			</p>
			<a
				href="/"
				class="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-surface transition hover:bg-brand-600"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="size-4"
					aria-hidden="true"
				>
					<line x1="19" y1="12" x2="5" y2="12" />
					<polyline points="12 19 5 12 12 5" />
				</svg>
				Back to dashboard
			</a>
		</section>
	{:else}
		<section class="text-center text-sm text-ink-muted">Loading…</section>
	{/if}
{:else}
	{@const completedCount = list.items.filter((i) => i.completed).length}
	<section class="space-y-6">
		<div class="flex flex-col gap-3">
			<a
				href="/"
				class="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-brand-700"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="size-4"
					aria-hidden="true"
				>
					<line x1="19" y1="12" x2="5" y2="12" />
					<polyline points="12 19 5 12 12 5" />
				</svg>
				All lists
			</a>
			{#if renaming}
				<form onsubmit={commitRename} class="flex flex-col gap-2 sm:flex-row sm:items-center">
					<label for="rename-list" class="sr-only">List name</label>
					<!-- svelte-ignore a11y_autofocus -->
					<input
						id="rename-list"
						type="text"
						bind:value={pendingName}
						class="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-2xl font-semibold text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
						autofocus
						maxlength="200"
						required
					/>
					<div class="flex gap-2">
						<button
							type="submit"
							class="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-surface transition hover:bg-brand-600"
						>
							Save
						</button>
						<button
							type="button"
							onclick={cancelRename}
							class="rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-surface-2"
						>
							Cancel
						</button>
					</div>
				</form>
			{:else}
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div class="space-y-1">
						<h1 class="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
							{list.name}
						</h1>
						<p class="text-sm text-ink-muted">
							{completedCount} of {list.items.length}
							{list.items.length === 1 ? 'item' : 'items'} done
						</p>
					</div>
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={startRename}
							class="rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-surface-2"
						>
							Rename
						</button>
						<button
							type="button"
							onclick={handleDeleteList}
							class="rounded-lg border border-border px-3 py-2 text-sm font-medium text-red-600 transition hover:border-red-200 hover:bg-red-50"
						>
							Delete
						</button>
					</div>
				</div>
			{/if}
		</div>

		<form
			onsubmit={handleAddItem}
			class="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3 shadow-sm sm:flex-row sm:items-center sm:p-4"
		>
			<label for="new-item-name" class="sr-only">New item</label>
			<input
				id="new-item-name"
				type="text"
				bind:value={newItemName}
				placeholder="Add an item…"
				maxlength="200"
				class="flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-ink outline-none placeholder:text-ink-subtle focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
				required
			/>
			<button
				type="submit"
				disabled={!newItemName.trim() || adding}
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
				Add
			</button>
		</form>

		{#if sortedItems.length === 0}
			<div
				class="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-ink-muted"
			>
				No items yet — add your first one above.
			</div>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each sortedItems as item (item.id)}
					<ItemRow {item} />
				{/each}
			</ul>
		{/if}
	</section>
{/if}
