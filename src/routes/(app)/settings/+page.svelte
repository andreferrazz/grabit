<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Settings · Grabit</title></svelte:head>

<h1 class="text-2xl font-semibold tracking-tight text-ink">Settings</h1>

<section class="card mt-6 p-5" aria-labelledby="account-heading">
	<h2 id="account-heading" class="text-sm font-semibold text-ink">Account</h2>
	<dl class="mt-3 space-y-2 text-sm">
		<div class="flex justify-between gap-4">
			<dt class="text-ink-muted">Name</dt>
			<dd class="truncate text-ink">{data.user.name}</dd>
		</div>
		<div class="flex justify-between gap-4">
			<dt class="text-ink-muted">Email</dt>
			<dd class="truncate text-ink">{data.user.email}</dd>
		</div>
	</dl>
	<form method="post" action="?/signOut" use:enhance class="mt-5">
		<button class="btn btn-quiet">Sign out</button>
	</form>
</section>
