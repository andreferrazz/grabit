<script lang="ts">
	let { value, max, label }: { value: number; max: number; label: string } = $props();

	const percent = $derived(max === 0 ? 0 : Math.round((value / max) * 100));
</script>

<div
	class="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
	role="progressbar"
	aria-label={label}
	aria-valuemin="0"
	aria-valuemax={max}
	aria-valuenow={value}
>
	<div
		class="h-full rounded-full bg-brand transition-[width] duration-300"
		style:width="{percent}%"
	></div>
</div>
