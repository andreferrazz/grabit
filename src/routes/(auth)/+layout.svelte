<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';

	let { children } = $props();
</script>

<div class="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
	<a href="/" class="mb-6"><Logo size="lg" /></a>
	<main class="card w-full max-w-sm p-6 sm:p-8">
		{@render children()}
	</main>
</div>
