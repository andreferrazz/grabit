<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { dragHandle } from 'svelte-dnd-action';
	import Icon from './Icon.svelte';

	type Item = { id: string; name: string; checked?: boolean };

	let {
		item,
		editing,
		editHref,
		cancelHref,
		onedit,
		oncancel,
		toggle,
		rename,
		remove,
		draggable = false
	}: {
		item: Item;
		editing: boolean;
		/** Where "edit" and "cancel" lead when JavaScript is off. */
		editHref: string;
		cancelHref: string;
		onedit: () => void;
		oncancel: () => void;
		/** Omitted for items that cannot be checked (template items). */
		toggle?: SubmitFunction;
		rename: SubmitFunction;
		remove: SubmitFunction;
		/** Shows a handle for drag-to-reorder. The parent list must be a drag zone. */
		draggable?: boolean;
	} = $props();

	function focusAndSelect(node: HTMLInputElement) {
		node.focus();
		node.select();
	}
</script>

<!-- The row's content; the page supplies the <li> so it can animate and reorder it. -->
{#if editing}
	<form
		method="post"
		action="?/renameItem"
		use:enhance={rename}
		class="flex flex-1 items-center gap-2 p-1.5"
	>
		<input type="hidden" name="id" value={item.id} />
		<input
			class="field"
			name="name"
			value={item.name}
			aria-label="Item name"
			required
			maxlength="200"
			autocomplete="off"
			use:focusAndSelect
			onkeydown={(event) => {
				if (event.key === 'Escape') oncancel();
			}}
		/>
		<button class="btn btn-primary shrink-0">Save</button>
		<a
			class="btn btn-quiet shrink-0"
			href={cancelHref}
			onclick={(event) => {
				event.preventDefault();
				oncancel();
			}}>Cancel</a
		>
	</form>
{:else}
	{#if draggable}
		<span
			use:dragHandle
			class="grid h-12 w-7 shrink-0 cursor-grab touch-none place-items-center text-ink-subtle hover:text-ink-muted active:cursor-grabbing"
			aria-label="Drag {item.name} to reorder"
		>
			<Icon name="grip" class="size-4" />
		</span>
	{/if}

	{#if toggle}
		<form method="post" action="?/toggle" use:enhance={toggle} class="min-w-0 flex-1">
			<input type="hidden" name="id" value={item.id} />
			<input type="hidden" name="checked" value={String(!item.checked)} />
			<button
				role="checkbox"
				aria-checked={item.checked}
				data-row-focus
				class={[
					'group flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl py-2 pr-3 text-left',
					draggable ? 'pl-1' : 'pl-3'
				]}
			>
				<span
					class={[
						'grid size-6 shrink-0 place-items-center rounded-lg border-2 transition',
						item.checked
							? 'border-brand bg-brand text-on-brand'
							: 'border-ink-subtle group-hover:border-brand'
					]}
					aria-hidden="true"
				>
					{#if item.checked}
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="3.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="tick size-4"
						>
							<path d="M20 6 9 17l-5-5" />
						</svg>
					{/if}
				</span>
				<span
					class={[
						'min-w-0 text-base break-words transition-colors',
						item.checked ? 'text-ink-subtle line-through' : 'text-ink'
					]}>{item.name}</span
				>
			</button>
		</form>
	{:else}
		<span
			class={[
				'min-w-0 flex-1 py-3 pr-3 text-base break-words text-ink',
				draggable ? 'pl-1' : 'pl-4'
			]}>{item.name}</span
		>
	{/if}

	<a
		href={editHref}
		class="grid size-10 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-3 hover:text-ink"
		aria-label="Edit {item.name}"
		data-row-focus={toggle ? undefined : ''}
		onclick={(event) => {
			event.preventDefault();
			onedit();
		}}
	>
		<Icon name="pencil" class="size-4" />
	</a>
	<form method="post" action="?/deleteItem" use:enhance={remove}>
		<input type="hidden" name="id" value={item.id} />
		<button
			class="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-muted transition hover:bg-danger-soft hover:text-danger"
			aria-label="Delete {item.name}"
		>
			<Icon name="trash" class="size-4" />
		</button>
	</form>
{/if}

<style>
	/* The tick draws itself in when an item is checked. */
	.tick path {
		stroke-dasharray: 24;
		stroke-dashoffset: 24;
		animation: draw 180ms ease-out forwards;
	}

	@keyframes draw {
		to {
			stroke-dashoffset: 0;
		}
	}
</style>
