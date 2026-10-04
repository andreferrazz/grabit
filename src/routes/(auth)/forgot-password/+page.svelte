<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head><title>Reset password · Grabit</title></svelte:head>

<h1 class="text-xl font-semibold text-ink">Reset your password</h1>

{#if form && 'sent' in form}
	<p class="mt-4 rounded-xl bg-brand-soft px-3 py-2 text-sm text-ink" role="status">
		If that address has an account, a reset link is on its way. It expires in one hour.
	</p>
{:else}
	<p class="mt-1 text-sm text-ink-muted">We'll email you a link to choose a new one.</p>

	<form method="post" use:enhance class="mt-6 space-y-4">
		<label class="block text-sm font-medium text-ink">
			Email
			<input class="field mt-1" type="email" name="email" autocomplete="email" required />
		</label>

		{#if form?.message}
			<p class="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
				{form.message}
			</p>
		{/if}

		<button class="btn btn-primary w-full">Send reset link</button>
	</form>
{/if}

<p class="mt-6 text-sm">
	<a class="font-medium text-brand hover:underline" href="/sign-in">Back to sign in</a>
</p>
