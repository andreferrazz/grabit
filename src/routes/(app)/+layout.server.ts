import { redirect } from '@sveltejs/kit';
import { listLists } from '#lib/server/operations/lists.ts';
import { run } from '#lib/server/operations/registry.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
	if (!locals.user) {
		const next = url.pathname + url.search;
		// Signing in lands on /open anyway, so the start pages need no ?next.
		const start = next === '/' || next === '/open';
		redirect(303, start ? '/sign-in' : `/sign-in?next=${encodeURIComponent(next)}`);
	}

	return {
		user: { name: locals.user.name, email: locals.user.email },
		theme: (cookies.get('theme') === 'light' || cookies.get('theme') === 'dark'
			? cookies.get('theme')
			: 'system') as 'system' | 'light' | 'dark',
		// Shown on the overview and, on wide screens, in the sidebar of every page.
		lists: await run(listLists, locals.user.id, {})
	};
};
