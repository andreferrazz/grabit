<script lang="ts">
	let { checkable = true }: { checkable?: boolean } = $props();

	let dialog = $state<HTMLDialogElement>();

	export function open() {
		dialog?.showModal();
	}

	const shortcuts = $derived(
		[
			['n', 'Add an item'],
			['j / ↓', 'Next item'],
			['k / ↑', 'Previous item'],
			checkable ? ['Space', 'Check or uncheck'] : null,
			['e', 'Edit'],
			['Delete', 'Delete'],
			['Alt + ↑ / ↓', 'Move up or down'],
			['Ctrl / ⌘ + Z', 'Undo delete'],
			['?', 'Show this help']
		].filter((row): row is [string, string] => row !== null)
	);
</script>

<dialog
	bind:this={dialog}
	aria-labelledby="shortcuts-title"
	class="m-auto w-[min(92vw,24rem)] rounded-2xl border border-border bg-surface p-5 text-ink shadow-card backdrop:bg-black/40"
>
	<h2 id="shortcuts-title" class="text-base font-semibold">Keyboard shortcuts</h2>
	<dl class="mt-4 space-y-2 text-sm">
		{#each shortcuts as [keys, action] (keys)}
			<div class="flex items-center justify-between gap-4">
				<dt class="text-ink-muted">{action}</dt>
				<dd>
					<kbd
						class="rounded-md border border-border bg-surface-2 px-2 py-0.5 font-sans text-xs font-medium"
						>{keys}</kbd
					>
				</dd>
			</div>
		{/each}
	</dl>
	<form method="dialog" class="mt-5">
		<button class="btn btn-quiet w-full">Close</button>
	</form>
</dialog>
