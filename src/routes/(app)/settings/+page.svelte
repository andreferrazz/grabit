<script lang="ts">
	import { enhance } from '$app/forms';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const created = $derived(form && 'createdToken' in form ? form.createdToken : undefined);
	const tokenError = $derived(form && 'tokenError' in form ? form.tokenError : undefined);
	const tokenForExamples = $derived(created?.key ?? '<your token>');

	const date = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

	const themes = [
		{ value: 'system', label: 'System' },
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' }
	] as const;
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

<section class="card mt-4 p-5" aria-labelledby="appearance-heading">
	<h2 id="appearance-heading" class="text-sm font-semibold text-ink">Appearance</h2>
	<form
		method="post"
		action="?/theme"
		class="mt-3"
		use:enhance={({ formData }) => {
			// Applied at once; the cookie makes the server render it this way from now on.
			const theme = String(formData.get('theme'));
			if (theme === 'system') delete document.documentElement.dataset.theme;
			else document.documentElement.dataset.theme = theme;
			return ({ update }) => update({ reset: false });
		}}
	>
		<fieldset>
			<legend class="sr-only">Theme</legend>
			<div class="inline-flex rounded-xl border border-border bg-surface-2 p-1">
				{#each themes as theme (theme.value)}
					<button
						name="theme"
						value={theme.value}
						aria-pressed={data.theme === theme.value}
						class={[
							'min-h-9 cursor-pointer rounded-lg px-4 text-sm font-medium transition',
							data.theme === theme.value
								? 'bg-surface text-ink shadow-card'
								: 'text-ink-muted hover:text-ink'
						]}
					>
						{theme.label}
					</button>
				{/each}
			</div>
		</fieldset>
	</form>
</section>

<section class="card mt-4 p-5" aria-labelledby="tokens-heading">
	<h2 id="tokens-heading" class="text-sm font-semibold text-ink">API tokens</h2>
	<p class="mt-1 text-sm text-ink-muted">
		A token lets an AI agent or a script read and change your lists and templates. It cannot sign in
		as you or change your account.
	</p>

	{#if created}
		<div class="mt-4 rounded-xl border border-brand bg-brand-soft p-3" role="status">
			<p class="text-sm font-medium text-ink">
				Token “{created.name}” created. Copy it now: it will not be shown again.
			</p>
			<div class="mt-2">
				<CodeBlock code={created.key} label="new token" />
			</div>
		</div>
	{/if}

	<form method="post" action="?/createToken" use:enhance class="mt-4 flex gap-2">
		<input
			class="field"
			name="name"
			placeholder="Token name, e.g. Claude"
			aria-label="Token name"
			required
			maxlength="32"
			autocomplete="off"
		/>
		<button class="btn btn-primary shrink-0">
			<Icon name="key" class="size-4" />
			Create token
		</button>
	</form>
	{#if tokenError}
		<p class="mt-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
			{tokenError}
		</p>
	{/if}

	{#if data.tokens.length > 0}
		<ul class="mt-4 divide-y divide-border" aria-label="Your tokens">
			{#each data.tokens as token (token.id)}
				<li class="flex items-center justify-between gap-3 py-3">
					<div class="min-w-0">
						<p class="truncate text-sm font-medium text-ink">{token.name}</p>
						<p class="text-xs text-ink-muted">
							<code>{token.start}…</code> · created {date.format(token.createdAt)} ·
							{token.lastUsedAt ? `last used ${date.format(token.lastUsedAt)}` : 'never used'}
						</p>
					</div>
					<form method="post" action="?/revokeToken" use:enhance>
						<input type="hidden" name="id" value={token.id} />
						<button class="btn btn-danger" aria-label="Revoke {token.name}">Revoke</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section class="card mt-4 p-5" aria-labelledby="connect-heading">
	<h2 id="connect-heading" class="text-sm font-semibold text-ink">Connect an AI agent</h2>

	<h3 class="mt-4 text-sm font-medium text-ink">Claude Code and other MCP clients</h3>
	<p class="mt-1 text-sm text-ink-muted">
		Grabit is an MCP server at <code>{data.origin}/mcp</code>. Create a token above, then run:
	</p>
	<div class="mt-2">
		<CodeBlock
			label="MCP command"
			code={`claude mcp add --transport http grabit ${data.origin}/mcp --header "Authorization: Bearer ${tokenForExamples}"`}
		/>
	</div>

	<h3 class="mt-5 text-sm font-medium text-ink">REST API</h3>
	<p class="mt-1 text-sm text-ink-muted">
		The same operations as JSON over HTTP. The full description is at
		<a class="font-medium text-brand hover:underline" href="/api/v1/openapi.json"
			>/api/v1/openapi.json</a
		>.
	</p>
	<div class="mt-2">
		<CodeBlock
			label="REST example"
			code={`curl -H "Authorization: Bearer ${tokenForExamples}" ${data.origin}/api/v1/lists`}
		/>
	</div>
</section>
