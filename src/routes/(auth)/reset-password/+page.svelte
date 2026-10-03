<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Choose a new password · Grabit</title></svelte:head>

<h1 class="text-xl font-semibold text-ink">Choose a new password</h1>

{#if data.hasToken}
	<form method="post" use:enhance class="mt-6 space-y-4">
		<label class="block text-sm font-medium text-ink">
			New password
			<input
				class="field mt-1"
				type="password"
				name="password"
				autocomplete="new-password"
				required
				minlength="8"
			/>
			<span class="mt-1 block text-xs font-normal text-ink-muted">At least 8 characters.</span>
		</label>

		{#if form?.message}
			<p class="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
				{form.message}
			</p>
		{/if}

		<button class="btn btn-primary w-full">Change password</button>
	</form>
{:else}
	<p class="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
		This reset link is incomplete. Request a new one.
	</p>
{/if}

<p class="mt-6 text-sm">
	<a class="font-medium text-brand hover:underline" href="/forgot-password">Request a new link</a>
</p>
