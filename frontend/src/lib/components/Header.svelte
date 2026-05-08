<script lang="ts">
	import SyncStatus from './SyncStatus.svelte';
</script>

<header
	class="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75"
>
	<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
		<a href="/" class="group flex items-center gap-2">
			<span
				class="grid size-8 place-items-center rounded-lg bg-brand-500 text-surface shadow-sm transition group-hover:bg-brand-600"
				aria-hidden="true"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="size-4"
				>
					<path d="M5 7h14l-1.5 11a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 7Z" />
					<path d="M9 7V5a3 3 0 0 1 6 0v2" />
				</svg>
			</span>
			<span class="flex flex-col leading-tight">
				<span class="text-lg font-semibold text-ink">Grabit</span>
				<span class="hidden text-[11px] text-ink-muted sm:inline"
					>Simple shopping lists for everyday buying</span
				>
			</span>
		</a>
		<SyncStatus />
	</div>
</header>
