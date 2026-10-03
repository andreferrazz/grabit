<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Connect {data.client.name} · Grabit</title></svelte:head>

<h1 class="text-xl font-semibold text-ink">Connect {data.client.name}?</h1>
<p class="mt-1 text-sm text-ink-muted">
	{data.client.name}
	{#if data.client.host}(<span class="font-medium text-ink">{data.client.host}</span>){/if}
	wants access to your Grabit account, <span class="font-medium text-ink">{data.user.email}</span>.
</p>

<h2 class="mt-5 text-sm font-semibold text-ink">It will be able to</h2>
<ul class="mt-2 space-y-2 text-sm text-ink" aria-label="Permissions">
	{#each data.permissions as permission (permission)}
		<li class="flex items-start gap-2">
			<span class="mt-0.5 text-brand"><Icon name="check" class="size-4" /></span>
			{permission}
		</li>
	{/each}
</ul>
<p class="mt-3 text-xs text-ink-muted">
	It cannot change your password or sign in as you. Only allow apps you trust.
</p>

{#if form?.message}
	<p class="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
		{form.message}
	</p>
{/if}

<!-- Plain form posts: the answer is a redirect to another site, which a fetch cannot follow. -->
<div class="mt-6 flex gap-3">
	<form method="post" action="?/deny" class="flex-1">
		<input type="hidden" name="oauth_query" value={data.oauthQuery} />
		<button class="btn btn-quiet w-full">Deny</button>
	</form>
	<form method="post" action="?/allow" class="flex-1">
		<input type="hidden" name="oauth_query" value={data.oauthQuery} />
		<button class="btn btn-primary w-full">Allow</button>
	</form>
</div>
