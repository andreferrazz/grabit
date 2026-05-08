import { listsApi } from '$lib/api/listsApi';
import type { ShoppingList } from '$lib/types';
import type { LayoutLoad } from './$types';

export const ssr = false;
export const prerender = false;

export const load: LayoutLoad = async () => {
	let initialLists: ShoppingList[] = [];
	let loadError: string | null = null;
	try {
		initialLists = await listsApi.getAll();
	} catch (err) {
		loadError = err instanceof Error ? err.message : 'Could not load lists';
	}
	return { initialLists, loadError };
};
