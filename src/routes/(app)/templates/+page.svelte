<script lang="ts">
	import { enhance } from '$app/forms';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Templates · Grabit</title></svelte:head>

<h1 class="text-2xl font-semibold tracking-tight text-ink">Templates</h1>
<p class="mt-1 text-sm text-ink-muted">Reusable lists. Start a fresh copy whenever you need one.</p>

<form method="post" action="?/create" use:enhance class="mt-5 flex gap-2">
	<input
		class="field"
		name="name"
		placeholder="New template name"
		aria-label="New template name"
		required
		maxlength="200"
		autocomplete="off"
	/>
	<button class="btn btn-primary shrink-0">
		<Icon name="plus" />
		Create
	</button>
</form>
{#if form?.message}
	<p class="mt-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
		{form.message}
	</p>
{/if}

{#if data.templates.length === 0}
	<div class="mt-6">
		<EmptyState icon="templates" title="No templates yet">
			Create one for anything you repeat: the weekly shop, a packing list, a release checklist.
		</EmptyState>
	</div>
{:else}
	<ul class="mt-6 space-y-3" aria-label="Your templates">
		{#each data.templates as template (template.id)}
			<li class="card flex items-center gap-2 p-2 pl-4">
				<a href="/templates/{template.id}" class="min-w-0 flex-1 py-2">
					<h2 class="truncate text-base font-semibold text-ink">{template.name}</h2>
					<p class="text-sm text-ink-muted">
						{template.itemCount}
						{template.itemCount === 1 ? 'item' : 'items'}
					</p>
				</a>
				<form method="post" action="?/use" use:enhance>
					<input type="hidden" name="templateId" value={template.id} />
					<button class="btn btn-quiet" aria-label="New list from {template.name}">
						<Icon name="copy" class="size-4" />
						New list
					</button>
				</form>
			</li>
		{/each}
	</ul>
{/if}
