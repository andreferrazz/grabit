<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const passwordWasReset = $derived(page.url.searchParams.has('reset'));
</script>

<svelte:head><title>Sign in · Grabit</title></svelte:head>

<h1 class="text-xl font-semibold text-ink">Sign in</h1>
<p class="mt-1 text-sm text-ink-muted">Welcome back.</p>

{#if passwordWasReset && !form}
	<p class="mt-4 rounded-xl bg-brand-soft px-3 py-2 text-sm text-ink" role="status">
		Your password was changed. Sign in with the new one.
	</p>
{/if}

<form method="post" use:enhance class="mt-6 space-y-4">
	<label class="block text-sm font-medium text-ink">
		Email
		<input
			class="field mt-1"
			type="email"
			name="email"
			autocomplete="email"
			required
			defaultValue={form?.email ?? ''}
		/>
	</label>
	<label class="block text-sm font-medium text-ink">
		Password
		<input
			class="field mt-1"
			type="password"
			name="password"
			autocomplete="current-password"
			required
		/>
	</label>

	{#if form?.message}
		<p class="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
			{form.message}
		</p>
	{/if}

	<button class="btn btn-primary w-full">Sign in</button>
</form>

<p class="mt-6 flex justify-between text-sm">
	<a class="font-medium text-brand hover:underline" href="/sign-up">Create an account</a>
	<a class="text-ink-muted hover:underline" href="/forgot-password">Forgot password?</a>
</p>
