<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head><title>Create an account · Grabit</title></svelte:head>

<h1 class="text-xl font-semibold text-ink">Create an account</h1>
<p class="mt-1 text-sm text-ink-muted">Lists and templates, on every device.</p>

<form method="post" use:enhance class="mt-6 space-y-4">
	<label class="block text-sm font-medium text-ink">
		Name
		<input
			class="field mt-1"
			name="name"
			autocomplete="name"
			required
			maxlength="100"
			defaultValue={form?.name ?? ''}
		/>
	</label>
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
			autocomplete="new-password"
			required
			minlength="8"
			aria-describedby="password-hint"
		/>
		<span id="password-hint" class="mt-1 block text-xs font-normal text-ink-muted"
			>At least 8 characters.</span
		>
	</label>

	{#if form?.message}
		<p class="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
			{form.message}
		</p>
	{/if}

	<button class="btn btn-primary w-full">Create account</button>
</form>

<p class="mt-6 text-sm text-ink-muted">
	Already have an account?
	<a class="font-medium text-brand hover:underline" href="/sign-in">Sign in</a>
</p>
