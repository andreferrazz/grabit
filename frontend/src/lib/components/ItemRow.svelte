<script lang="ts">
	import { shopping } from '$lib/stores/shopping.svelte';
	import type { ShoppingItem } from '$lib/types';

	type Props = { item: ShoppingItem };
	let { item }: Props = $props();

	const isPending = $derived(item.id.startsWith('temp-'));

	let editing = $state(false);
	let pendingName = $state('');

	function startEdit() {
		pendingName = item.name;
		editing = true;
	}

	function cancelEdit() {
		editing = false;
	}

	async function commitEdit(event: Event) {
		event.preventDefault();
		const next = pendingName.trim();
		if (next && next !== item.name) {
			await shopping.renameItem(item.listId, item.id, next);
		}
		editing = false;
	}

	async function toggle() {
		await shopping.toggleItem(item.listId, item.id);
	}

	async function remove() {
		await shopping.deleteItem(item.listId, item.id);
	}
</script>

<li
	class="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 shadow-sm transition sm:px-4"
	class:opacity-60={isPending}
>
	<label class="relative flex shrink-0 cursor-pointer items-center">
		<input
			type="checkbox"
			checked={item.completed}
			onchange={toggle}
			disabled={isPending}
			class="peer size-6 cursor-pointer appearance-none rounded-md border-2 border-border bg-surface transition checked:border-brand-500 checked:bg-brand-500 hover:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed"
			aria-label={`Mark ${item.name} as ${item.completed ? 'incomplete' : 'completed'}`}
		/>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="3"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="pointer-events-none absolute inset-0 m-auto size-4 text-surface opacity-0 peer-checked:opacity-100"
			aria-hidden="true"
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	</label>

	{#if editing}
		<form onsubmit={commitEdit} class="flex flex-1 items-center gap-2">
			<label class="sr-only" for={`item-edit-${item.id}`}>Item name</label>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				id={`item-edit-${item.id}`}
				type="text"
				bind:value={pendingName}
				class="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-base text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
				autofocus
				maxlength="200"
				required
			/>
			<button
				type="submit"
				class="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-surface transition hover:bg-brand-600"
			>
				Save
			</button>
			<button
				type="button"
				onclick={cancelEdit}
				class="rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink-muted transition hover:bg-surface-2"
			>
				Cancel
			</button>
		</form>
	{:else}
		<span
			class="flex-1 select-text text-base text-ink"
			class:line-through={item.completed}
			class:text-ink-subtle={item.completed}
		>
			{item.name}
		</span>
		<div class="flex items-center gap-1">
			<button
				type="button"
				onclick={startEdit}
				disabled={isPending}
				class="rounded-lg p-2 text-ink-muted transition hover:bg-surface-2 disabled:opacity-50"
				aria-label="Edit {item.name}"
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
					<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
					<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
				</svg>
			</button>
			<button
				type="button"
				onclick={remove}
				disabled={isPending}
				class="rounded-lg p-2 text-ink-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
				aria-label="Delete {item.name}"
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
					<polyline points="3 6 5 6 21 6" />
					<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
					<path d="M10 11v6" />
					<path d="M14 11v6" />
					<path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
				</svg>
			</button>
		</div>
	{/if}
</li>
