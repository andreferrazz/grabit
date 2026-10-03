<script lang="ts">
	import { enhance } from '$app/forms';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { tick, untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { crossfade, fade } from 'svelte/transition';
	import { dragHandleZone } from 'svelte-dnd-action';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import ItemRow from '#lib/components/ItemRow.svelte';
	import Progress from '#lib/components/Progress.svelte';
	import ShortcutsHelp from '#lib/components/ShortcutsHelp.svelte';
	import { duration } from '#lib/motion.ts';
	import { focusItem, handleShortcut } from '#lib/shortcuts.ts';
	import { useSync } from '#lib/state/sync.svelte.ts';
	import { OptimisticForms } from '#lib/state/optimistic.svelte.ts';
	import { useToasts } from '#lib/state/toasts.svelte.ts';
	import type { PageData } from './$types';

	type Item = PageData['list']['items'][number];

	let { data }: { data: PageData } = $props();

	const toasts = useToasts();

	// Local copies that the forms change at once.
	let items = $state.raw(untrack(() => data.list.items));
	let listName = $state(untrack(() => data.list.name));
	let shownId = untrack(() => data.list.id);

	const forms = new OptimisticForms({
		revert: () => {
			items = data.list.items;
			listName = data.list.name;
		},
		onError: (message) => toasts.error(message),
		sync: useSync()
	});

	// Fresh server data replaces the local copies, except while a change is still on
	// its way: that data was read before the change and would undo it on screen (and
	// move the item under the user's cursor). The answer to the change reloads again.
	$effect.pre(() => {
		const fresh = data.list;
		if (forms.pending === 0 || fresh.id !== shownId) {
			items = fresh.items;
			listName = fresh.name;
			shownId = fresh.id;
		}
	});

	// Which item is being edited. Plain state, not derived from the data: a background
	// refresh must not close an edit in progress. Navigation (?edit=...) still sets it.
	let editingId = $state(untrack(() => data.editingId));
	afterNavigate(() => {
		editingId = page.url.searchParams.get('edit');
	});

	// A checked item glides from "To do" to "Done" (and back) instead of jumping.
	const [send, receive] = crossfade({
		duration: () => duration(220),
		fallback: (node) => fade(node, { duration: duration(150) })
	});

	const todo = $derived(items.filter((item) => !item.checked));
	const done = $derived(items.filter((item) => item.checked));
	const base = $derived(`/lists/${data.list.id}`);

	let draft = $state('');
	let composer = $state<HTMLFormElement>();
	let pasted = $state('');
	let menu = $state<HTMLDetailsElement>();

	function nextPosition(): number {
		return items.reduce((max, item) => Math.max(max, item.position), -1) + 1;
	}

	const add = forms.submit(({ formData }) => {
		const several = formData.get('items');
		if (typeof several === 'string' && several) {
			const parsed = JSON.parse(several) as { id: string; name: string }[];
			let position = nextPosition();
			items = [
				...items,
				...parsed.map((item) => ({
					...item,
					checked: false,
					checkedAt: null,
					position: position++
				}))
			];
			pasted = '';
			return;
		}

		const name = String(formData.get('name') ?? '').trim();
		if (!name) return false;
		const id = crypto.randomUUID();
		formData.set('id', id);
		items = [...items, { id, name, checked: false, checkedAt: null, position: nextPosition() }];
		draft = '';
		keepComposerFocused();
	});

	/** Phones blur the field (and close the keyboard) on submit; adding several items needs it open. */
	function keepComposerFocused() {
		const field = composer?.elements.namedItem('name');
		if (field instanceof HTMLInputElement) setTimeout(() => field.focus());
	}

	/** Pasting several lines adds one item per line. */
	async function onpaste(event: ClipboardEvent) {
		const lines = (event.clipboardData?.getData('text') ?? '')
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);
		if (lines.length < 2) return;

		event.preventDefault();
		pasted = JSON.stringify(
			lines.slice(0, 500).map((name) => ({ id: crypto.randomUUID(), name: name.slice(0, 200) }))
		);
		await tick();
		composer?.requestSubmit();
	}

	const toggle = forms.submit(({ formData }) => {
		const id = formData.get('id');
		const checked = formData.get('checked') === 'true';
		items = items.map((item) =>
			item.id === id ? { ...item, checked, checkedAt: checked ? new Date() : null } : item
		);
	});

	const renameItem = forms.submit(({ formData }) => {
		const id = formData.get('id');
		const name = String(formData.get('name') ?? '').trim();
		if (!name) return false;
		items = items.map((item) => (item.id === id ? { ...item, name } : item));
		stopEditing(String(id));
	});

	/** Leaves edit mode and puts keyboard focus back on the row, where it was before. */
	async function stopEditing(itemId: string) {
		editingId = null;
		await tick();
		focusItem(itemId);
	}

	let restoring = $state<Item>();
	let restoreForm = $state<HTMLFormElement>();
	let lastRemoved: Item | undefined;

	async function undoRemove(removed: Item) {
		if (lastRemoved === removed) lastRemoved = undefined;
		restoring = removed;
		await tick();
		restoreForm?.requestSubmit();
	}

	const remove = forms.submit(({ formData }) => {
		const removed = items.find((item) => item.id === formData.get('id'));
		if (!removed) return false;
		items = items.filter((item) => item.id !== removed.id);
		lastRemoved = removed;
		toasts.show(`Deleted “${removed.name}”`, {
			action: { label: 'Undo', run: () => undoRemove(removed) }
		});
	});

	const restore = forms.submit(() => {
		if (!restoring) return false;
		items = [...items, restoring].sort((a, b) => a.position - b.position || (a.id < b.id ? -1 : 1));
	});

	const renameList = forms.submit(({ formData }) => {
		const name = String(formData.get('name') ?? '').trim();
		if (!name) return false;
		listName = name;
		if (menu) menu.open = false;
	});

	const uncheckAll = forms.submit(() => {
		items = items.map((item) => ({ ...item, checked: false, checkedAt: null }));
		if (menu) menu.open = false;
	});

	const clearChecked = forms.submit(() => {
		items = items.filter((item) => !item.checked);
		if (menu) menu.open = false;
	});

	// Reordering. Only the "To do" items can be dragged; "Done" keeps its order after them.
	let order = $state('');
	let reorderForm = $state<HTMLFormElement>();
	const reorder = forms.submit();

	function setTodoOrder(next: Item[]) {
		items = [...next, ...done];
	}

	async function commitOrder() {
		items = items.map((item, position) => ({ ...item, position }));
		order = JSON.stringify(items.map((item) => item.id));
		await tick();
		reorderForm?.requestSubmit();
	}

	async function move(itemId: string, direction: -1 | 1) {
		const index = todo.findIndex((item) => item.id === itemId);
		const target = index + direction;
		if (index === -1 || target < 0 || target >= todo.length) return;
		const next = [...todo];
		[next[index], next[target]] = [next[target], next[index]];
		setTodoOrder(next);
		await commitOrder();
		focusItem(itemId);
	}

	let help = $state<ShortcutsHelp>();

	function onkeydown(event: KeyboardEvent) {
		handleShortcut(event, {
			focusComposer: () => composer?.querySelector<HTMLInputElement>('[data-composer]')?.focus(),
			edit: (itemId) => (editingId = itemId),
			remove: (itemId) =>
				document
					.querySelector<HTMLFormElement>(`[data-item-id="${itemId}"] form[action$="deleteItem"]`)
					?.requestSubmit(),
			move,
			undo: () => {
				if (lastRemoved) void undoRemove(lastRemoved);
			},
			help: () => help?.open()
		});
	}
</script>

<svelte:window {onkeydown} />

<svelte:head><title>{listName} · Grabit</title></svelte:head>

<a
	href="/"
	class="-ml-2 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-muted hover:text-ink md:hidden"
>
	<Icon name="back" class="size-4" />
	Lists
</a>

<header class="mt-1 flex items-start justify-between gap-3 md:mt-0">
	<h1 class="min-w-0 text-2xl font-semibold tracking-tight break-words text-ink">{listName}</h1>

	<details bind:this={menu} class="relative shrink-0">
		<summary
			class="grid size-10 cursor-pointer list-none place-items-center rounded-xl text-ink-muted transition hover:bg-surface-3 hover:text-ink [&::-webkit-details-marker]:hidden"
			aria-label="List options"
		>
			<Icon name="more" class="size-5" />
		</summary>
		<div class="card absolute right-0 z-20 mt-1 w-72 space-y-3 p-3">
			<form method="post" action="?/rename" use:enhance={renameList} class="flex gap-2">
				<input
					class="field"
					name="name"
					value={listName}
					aria-label="List name"
					required
					maxlength="200"
					autocomplete="off"
				/>
				<button class="btn btn-quiet shrink-0">Rename</button>
			</form>
			<form method="post" action="?/uncheckAll" use:enhance={uncheckAll}>
				<button class="btn btn-quiet w-full" disabled={done.length === 0}>Uncheck all</button>
			</form>
			<form method="post" action="?/clearChecked" use:enhance={clearChecked}>
				<button class="btn btn-quiet w-full" disabled={done.length === 0}
					>Remove checked items</button
				>
			</form>
			<form method="post" action="?/saveAsTemplate" use:enhance>
				<button class="btn btn-quiet w-full" disabled={items.length === 0}>Save as template</button>
			</form>
			<details class="rounded-xl border border-border">
				<summary
					class="flex min-h-11 cursor-pointer list-none items-center justify-center px-3 text-sm font-semibold text-danger [&::-webkit-details-marker]:hidden"
				>
					Delete list…
				</summary>
				<form method="post" action="?/delete" use:enhance class="p-3 pt-0">
					<p class="pb-3 text-sm text-ink-muted">
						This deletes the list and its {items.length}
						{items.length === 1 ? 'item' : 'items'} for good.
					</p>
					<button class="btn btn-danger w-full">Delete permanently</button>
				</form>
			</details>
		</div>
	</details>
</header>

{#if items.length > 0}
	<div class="mt-3 flex items-center gap-3">
		<Progress value={done.length} max={items.length} label="Progress" />
		<span class="shrink-0 text-sm text-ink-muted tabular-nums" data-testid="progress-text">
			{#if done.length === items.length}
				All done
			{:else}
				{done.length} of {items.length}
			{/if}
		</span>
	</div>
{/if}

<!-- Docked above the tab bar on phones, in the flow of the page on wider screens. -->
<div
	class="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-surface/95 px-4 py-2 backdrop-blur md:static md:mt-5 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
>
	<form
		bind:this={composer}
		method="post"
		action="?/add"
		use:enhance={add}
		class="mx-auto flex max-w-2xl gap-2"
	>
		<input type="hidden" name="items" value={pasted} />
		<input
			class="field"
			name="name"
			bind:value={draft}
			{onpaste}
			placeholder="Add an item"
			aria-label="Add an item"
			maxlength="200"
			autocomplete="off"
			enterkeyhint="enter"
			data-composer
		/>
		<button class="btn btn-primary shrink-0" aria-label="Add item">
			<Icon name="plus" />
			<span class="hidden sm:inline">Add</span>
		</button>
	</form>
</div>

<form
	bind:this={reorderForm}
	method="post"
	action="?/reorder"
	use:enhance={reorder}
	hidden
	aria-hidden="true"
>
	<input type="hidden" name="order" value={order} />
</form>

<form
	bind:this={restoreForm}
	method="post"
	action="?/restoreItem"
	use:enhance={restore}
	hidden
	aria-hidden="true"
>
	<input type="hidden" name="id" value={restoring?.id ?? ''} />
	<input type="hidden" name="name" value={restoring?.name ?? ''} />
	<input type="hidden" name="checked" value={String(restoring?.checked ?? false)} />
	<input type="hidden" name="position" value={restoring?.position ?? 0} />
</form>

{#snippet row(item: Item, draggable: boolean)}
	<ItemRow
		{item}
		{draggable}
		editing={editingId === item.id}
		editHref="{base}?edit={item.id}"
		cancelHref={base}
		onedit={() => (editingId = item.id)}
		oncancel={() => stopEditing(item.id)}
		{toggle}
		rename={renameItem}
		{remove}
	/>
{/snippet}

<div class="mt-5 pb-16 md:pb-0">
	{#if items.length === 0}
		<EmptyState icon="lists" title="This list is empty">
			Add the first item below. Paste several lines to add them all at once.
		</EmptyState>
	{:else}
		<ul
			class="flex flex-col gap-2"
			aria-label="To do"
			use:dragHandleZone={{
				items: todo,
				flipDurationMs: duration(150),
				dropTargetStyle: {},
				dragDisabled: editingId !== null
			}}
			onconsider={(event) => setTodoOrder(event.detail.items)}
			onfinalize={(event) => {
				setTodoOrder(event.detail.items);
				void commitOrder();
			}}
		>
			{#each todo as item (item.id)}
				<li
					class="flex items-center gap-0.5 rounded-xl border border-border bg-surface pr-1 shadow-card"
					data-item-id={item.id}
					animate:flip={{ duration: duration(150) }}
					in:receive={{ key: item.id }}
					out:send={{ key: item.id }}
				>
					{@render row(item, true)}
				</li>
			{/each}
		</ul>

		{#if done.length > 0}
			<h2 class="mt-6 mb-2 text-sm font-semibold text-ink-muted">Done ({done.length})</h2>
			<ul class="flex flex-col gap-2" aria-label="Done">
				{#each done as item (item.id)}
					<li
						class="flex items-center gap-0.5 rounded-xl border border-border bg-surface pr-1 shadow-card"
						data-item-id={item.id}
						animate:flip={{ duration: duration(150) }}
						in:receive={{ key: item.id }}
						out:send={{ key: item.id }}
					>
						{@render row(item, false)}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<p class="mt-8 hidden text-center text-xs text-ink-subtle md:block">
	<button type="button" class="cursor-pointer hover:underline" onclick={() => help?.open()}>
		Keyboard shortcuts
	</button>
	— press <kbd class="font-sans font-medium">?</kbd>
</p>

<ShortcutsHelp bind:this={help} />
