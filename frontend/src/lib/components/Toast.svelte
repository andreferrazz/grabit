<script lang="ts">
	import { sync } from '$lib/stores/sync.svelte';
</script>

{#if sync.lastError}
	<div
		class="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 sm:bottom-6"
		role="alert"
		aria-live="assertive"
	>
		<div
			class="pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="mt-0.5 size-4 shrink-0 text-red-500"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			<span class="leading-snug">{sync.lastError}</span>
		</div>
	</div>
{/if}
