<script lang="ts">
	type Props = {
		title: string;
		description?: string;
	};
	let { title, description }: Props = $props();
</script>

<div class="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
	<div
		class="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600"
		aria-hidden="true"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-6"
		>
			<path d="M5 7h14l-1.5 11a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 7Z" />
			<path d="M9 7V5a3 3 0 0 1 6 0v2" />
		</svg>
	</div>
	<h2 class="text-base font-semibold text-ink">{title}</h2>
	{#if description}
		<p class="mt-1 text-sm text-ink-muted">{description}</p>
	{/if}
</div>
