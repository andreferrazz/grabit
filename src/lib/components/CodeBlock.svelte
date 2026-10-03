<script lang="ts">
	let { code, label }: { code: string; label: string } = $props();

	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(code);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="relative">
	<pre
		class="overflow-x-auto rounded-xl bg-surface-3 p-3 pr-20 text-xs leading-relaxed text-ink"
		aria-label={label}><code>{code}</code></pre>
	<button
		type="button"
		onclick={copy}
		class="absolute top-2 right-2 min-h-8 cursor-pointer rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-ink hover:bg-surface-2"
		aria-label="Copy {label}"
	>
		{copied ? 'Copied' : 'Copy'}
	</button>
</div>
