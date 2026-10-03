<script lang="ts">
	let { size = 'md' }: { size?: 'md' | 'lg' } = $props();
</script>

<span class="flex items-center gap-2.5">
	<span
		class={[
			'grid place-items-center rounded-xl bg-brand text-on-brand',
			size === 'lg' ? 'size-11' : 'size-9'
		]}
		aria-hidden="true"
	>
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class={size === 'lg' ? 'size-6' : 'size-5'}
		>
			<path d="M5 7h14l-1.5 11a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 7Z" />
			<path d="M9 7V5a3 3 0 0 1 6 0v2" />
		</svg>
	</span>
	<span class={['font-semibold tracking-tight text-ink', size === 'lg' ? 'text-2xl' : 'text-lg']}
		>Grabit</span
	>
</span>
