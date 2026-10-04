import { getContext, setContext } from 'svelte';

/** How many changes are on their way to the server, across the whole page tree. */
export class Sync {
	pending = $state(0);
}

const key = Symbol('sync');

export function provideSync(): Sync {
	return setContext(key, new Sync());
}

export function useSync(): Sync {
	return getContext<Sync>(key);
}
