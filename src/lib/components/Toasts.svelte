<script lang="ts">
	import { fly } from 'svelte/transition';
	import { useToasts } from '#lib/state/toasts.svelte.ts';

	const toasts = useToasts();
</script>

<div
	class="pointer-events-none fixed inset-x-0 bottom-36 z-40 flex flex-col items-center gap-2 px-4 md:bottom-6"
	role="status"
	aria-live="polite"
>
	{#each toasts.list as toast (toast.id)}
		<div
			transition:fly={{ y: 16, duration: 180 }}
			class={[
				'pointer-events-auto flex min-h-11 max-w-sm items-center gap-3 rounded-xl py-1 pr-1 pl-4 text-sm shadow-card',
				toast.tone === 'danger' ? 'bg-danger text-surface' : 'bg-ink text-surface'
			]}
		>
			<span class="py-2">{toast.message}</span>
			{#if toast.action}
				<button
					type="button"
					class="min-h-9 cursor-pointer rounded-lg px-3 font-semibold underline-offset-2 hover:underline"
					onclick={() => {
						toast.action?.run();
						toasts.dismiss(toast.id);
					}}
				>
					{toast.action.label}
				</button>
			{:else}
				<span class="pr-3"></span>
			{/if}
		</div>
	{/each}
</div>
