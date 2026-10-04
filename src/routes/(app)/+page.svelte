<script lang="ts">
	import { enhance } from '$app/forms';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import ListCard from '#lib/components/ListCard.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Lists · Grabit</title></svelte:head>

<h1 class="text-2xl font-semibold tracking-tight text-ink">Lists</h1>

<form method="post" action="?/create" use:enhance class="mt-5 flex gap-2">
	<input
		class="field"
		name="name"
		placeholder="New list name"
		aria-label="New list name"
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

{#if data.templates.length > 0}
	<div
		class="mt-3 flex flex-wrap items-center gap-2"
		role="group"
		aria-label="Start from a template"
	>
		<span class="text-sm text-ink-muted">Start from a template:</span>
		{#each data.templates as template (template.id)}
			<form method="post" action="?/fromTemplate" use:enhance>
				<input type="hidden" name="templateId" value={template.id} />
				<button
					class="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm font-medium text-ink transition hover:border-brand hover:bg-brand-soft"
				>
					<Icon name="copy" class="size-3.5 text-ink-muted" />
					{template.name}
				</button>
			</form>
		{/each}
	</div>
{/if}

{#if data.lists.length === 0}
	<div class="mt-6">
		<EmptyState icon="lists" title="No lists yet">
			Name your first list above, then add the things you need to grab.
		</EmptyState>
	</div>
{:else}
	<ul class="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Your lists">
		{#each data.lists as list (list.id)}
			<li><ListCard {list} /></li>
		{/each}
	</ul>
{/if}
