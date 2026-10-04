<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';

	const notFound = $derived(page.status === 404);
	// A 404 carries the server's own wording ("List not found"); anything else stays vague.
	const title = $derived(notFound ? (page.error?.message ?? 'Not found') : 'Something went wrong');
</script>

<svelte:head><title>{title} · Grabit</title></svelte:head>

<div class="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
	<a href="/" class="mb-6"><Logo size="lg" /></a>
	<main class="card w-full max-w-sm p-6 sm:p-8">
		<p class="text-sm font-medium text-ink-muted">Error {page.status}</p>
		<h1 class="mt-1 text-xl font-semibold text-ink">{title}</h1>
		<p class="mt-2 text-sm text-ink-muted">
			{#if notFound}
				It may have been deleted, or the link is wrong.
			{:else}
				Nothing was lost. Try again; if it keeps happening, the code below identifies this failure
				in the server log.
			{/if}
		</p>
		{#if page.error?.errorId && !notFound}
			<p class="mt-3 text-sm text-ink-muted">
				Code: <code data-testid="error-id" class="text-ink">{page.error.errorId}</code>
			</p>
		{/if}
		<div class="mt-6 flex gap-2">
			{#if !notFound}
				<button type="button" class="btn btn-primary" onclick={() => location.reload()}>
					Try again
				</button>
			{/if}
			<a href="/" class="btn btn-quiet">Back to your lists</a>
		</div>
	</main>
</div>
