<script lang="ts">
	import { page } from '$app/state';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import Logo from '#lib/components/Logo.svelte';
	import Toasts from '#lib/components/Toasts.svelte';
	import { provideSync } from '#lib/state/sync.svelte.ts';
	import { provideToasts } from '#lib/state/toasts.svelte.ts';
	import { invalidateAll } from '$app/navigation';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	provideToasts();
	const sync = provideSync();

	// Coming back to the tab or the app reloads the data, so changes made elsewhere
	// (another device, an AI agent) show up without a manual refresh.
	let lastRefresh = Date.now();
	function refresh() {
		if (document.visibilityState !== 'visible' || sync.pending > 0) return;
		if (Date.now() - lastRefresh < 2000) return;
		lastRefresh = Date.now();
		void invalidateAll();
	}

	const tabs: { href: string; label: string; icon: IconName; match: (path: string) => boolean }[] =
		[
			{
				href: '/',
				label: 'Lists',
				icon: 'lists',
				match: (path) => path === '/' || path.startsWith('/lists')
			},
			{
				href: '/templates',
				label: 'Templates',
				icon: 'templates',
				match: (path) => path.startsWith('/templates')
			},
			{
				href: '/settings',
				label: 'Settings',
				icon: 'settings',
				match: (path) => path.startsWith('/settings')
			}
		];
</script>

<svelte:window
	onfocus={refresh}
	onbeforeunload={(event) => {
		// Leaving while a change is still on its way would lose it; the browser asks first.
		if (sync.pending > 0) event.preventDefault();
	}}
/>
<svelte:document onvisibilitychange={refresh} />

<div data-pending={sync.pending} class="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
	<aside
		class="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border bg-surface p-4 md:flex"
	>
		<a href="/" class="px-2 pt-1"><Logo /></a>
		<nav aria-label="Main" class="flex flex-col gap-1">
			{#each tabs as tab (tab.href)}
				{@const active = tab.match(page.url.pathname)}
				<a
					href={tab.href}
					aria-current={active ? 'page' : undefined}
					class={[
						'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition',
						active ? 'bg-brand-soft text-ink' : 'text-ink-muted hover:bg-surface-3 hover:text-ink'
					]}
				>
					<Icon name={tab.icon} />
					{tab.label}
				</a>
			{/each}
		</nav>

		{#if data.lists.length > 0}
			<nav aria-label="Your lists" class="-mx-1 flex min-h-0 flex-col gap-0.5 overflow-y-auto px-1">
				<h2 class="px-3 pb-1 text-xs font-semibold tracking-wide text-ink-subtle uppercase">
					Your lists
				</h2>
				{#each data.lists as list (list.id)}
					{@const active = page.url.pathname === `/lists/${list.id}`}
					<a
						href="/lists/{list.id}"
						aria-current={active ? 'page' : undefined}
						class={[
							'flex min-h-9 items-center justify-between gap-2 rounded-lg px-3 text-sm transition',
							active
								? 'bg-surface-3 font-medium text-ink'
								: 'text-ink-muted hover:bg-surface-3 hover:text-ink'
						]}
					>
						<span class="truncate">{list.name}</span>
						{#if list.itemCount > 0}
							<span class="shrink-0 text-xs text-ink-subtle tabular-nums"
								>{list.checkedCount}/{list.itemCount}</span
							>
						{/if}
					</a>
				{/each}
			</nav>
		{/if}
	</aside>

	<main class="mx-auto w-full max-w-2xl px-4 pt-6 pb-28 md:px-8 md:pt-10 md:pb-12">
		{@render children()}
	</main>

	{#if sync.pending > 0}
		<div
			class="saving pointer-events-none fixed top-3 right-3 z-40 rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-muted shadow-card"
			role="status"
			aria-label="Saving"
		>
			Saving…
		</div>
	{/if}

	<Toasts />

	<nav
		aria-label="Main"
		class="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
	>
		<div class="mx-auto grid max-w-2xl grid-cols-3">
			{#each tabs as tab (tab.href)}
				{@const active = tab.match(page.url.pathname)}
				<a
					href={tab.href}
					aria-current={active ? 'page' : undefined}
					class={[
						'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition',
						active ? 'text-brand' : 'text-ink-muted'
					]}
				>
					<Icon name={tab.icon} class="size-6" />
					{tab.label}
				</a>
			{/each}
		</div>
	</nav>
</div>

<style>
	/* Appears only when a save takes long enough to notice. */
	.saving {
		opacity: 0;
		animation: appear 150ms ease-out 400ms forwards;
	}

	@keyframes appear {
		to {
			opacity: 1;
		}
	}
</style>
