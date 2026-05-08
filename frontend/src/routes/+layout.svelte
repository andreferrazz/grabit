<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { shopping } from '$lib/stores/shopping.svelte';
	import { sync } from '$lib/stores/sync.svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	type Props = { children: Snippet; data: LayoutData };
	let { children, data }: Props = $props();

	$effect(() => {
		if (!shopping.hydrated) {
			shopping.hydrate(data.initialLists);
			if (data.loadError) {
				sync.fail(data.loadError);
			}
		}
	});
</script>

<svelte:head>
	<title>Grabit — Simple shopping lists for everyday buying</title>
	<meta name="description" content="Simple shopping lists for everyday buying" />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<Header />
	<main class="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
		{@render children()}
	</main>
	<Toast />
</div>
