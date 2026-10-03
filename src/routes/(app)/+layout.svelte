<script lang="ts">
	import { page } from '$app/state';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import Logo from '#lib/components/Logo.svelte';

	let { children } = $props();

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

<div class="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
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
	</aside>

	<main class="mx-auto w-full max-w-2xl px-4 pt-6 pb-28 md:px-8 md:pt-10 md:pb-12">
		{@render children()}
	</main>

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
