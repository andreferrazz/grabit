<script lang="ts">
	import { goto } from '$app/navigation';
	import { shopping } from '$lib/stores/shopping.svelte';
	import type { ShoppingList } from '$lib/types';

	type Props = { list: ShoppingList };
	let { list }: Props = $props();

	const totalItems = $derived(list.items.length);
	const completedItems = $derived(list.items.filter((i) => i.completed).length);

	const isPending = $derived(list.id.startsWith('temp-'));

	const createdLabel = $derived(formatDate(list.createdAt));

	let renaming = $state(false);
	let pendingName = $state('');

	function startRename(event: MouseEvent) {
		event.stopPropagation();
		pendingName = list.name;
		renaming = true;
	}

	function cancelRename(event?: Event) {
		event?.stopPropagation();
		renaming = false;
	}

	async function commitRename(event: Event) {
		event.preventDefault();
		event.stopPropagation();
		const next = pendingName.trim();
		if (next && next !== list.name) {
			await shopping.renameList(list.id, next);
		}
		renaming = false;
	}

	async function deleteList(event: MouseEvent) {
		event.stopPropagation();
		if (confirm(`Delete "${list.name}" and all its items?`)) {
			await shopping.deleteList(list.id);
		}
	}

	function open() {
		if (isPending) return;
		goto(`/lists/${list.id}`);
	}

	function formatDate(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
	}
</script>

<article
	class="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md sm:p-5"
	class:opacity-60={isPending}
>
	{#if renaming}
		<form onsubmit={commitRename} class="flex flex-col gap-2">
			<label class="sr-only" for={`rename-${list.id}`}>List name</label>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				id={`rename-${list.id}`}
				type="text"
				bind:value={pendingName}
				class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
				autofocus
				maxlength="200"
				required
			/>
			<div class="flex gap-2">
				<button
					type="submit"
					class="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-surface transition hover:bg-brand-600"
				>
					Save
				</button>
				<button
					type="button"
					onclick={cancelRename}
					class="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink-muted transition hover:bg-surface-2"
				>
					Cancel
				</button>
			</div>
		</form>
	{:else}
		<button
			type="button"
			onclick={open}
			class="flex flex-col items-start gap-2 text-left"
			disabled={isPending}
		>
			<h3
				class="text-lg font-semibold text-ink transition group-hover:text-brand-700 sm:text-xl"
			>
				{list.name}
			</h3>
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
				<span class="inline-flex items-center gap-1">
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
						<line x1="8" y1="6" x2="21" y2="6" />
						<line x1="8" y1="12" x2="21" y2="12" />
						<line x1="8" y1="18" x2="21" y2="18" />
						<line x1="3" y1="6" x2="3.01" y2="6" />
						<line x1="3" y1="12" x2="3.01" y2="12" />
						<line x1="3" y1="18" x2="3.01" y2="18" />
					</svg>
					{totalItems}
					{totalItems === 1 ? 'item' : 'items'}
				</span>
				<span class="inline-flex items-center gap-1">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="size-4 text-brand-500"
						aria-hidden="true"
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>
					{completedItems} done
				</span>
				<span class="text-ink-subtle">·</span>
				<span>{createdLabel}</span>
			</div>
		</button>
		<div class="flex flex-wrap items-center gap-2 border-t border-border pt-3">
			<button
				type="button"
				onclick={open}
				class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-surface transition hover:bg-brand-600 disabled:opacity-50"
				disabled={isPending}
			>
				Open
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
					<line x1="5" y1="12" x2="19" y2="12" />
					<polyline points="12 5 19 12 12 19" />
				</svg>
			</button>
			<button
				type="button"
				onclick={startRename}
				class="rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-surface-2"
				aria-label="Rename {list.name}"
			>
				Rename
			</button>
			<button
				type="button"
				onclick={deleteList}
				class="rounded-lg border border-border px-3 py-2 text-sm font-medium text-red-600 transition hover:border-red-200 hover:bg-red-50"
				aria-label="Delete {list.name}"
			>
				Delete
			</button>
		</div>
	{/if}
</article>
