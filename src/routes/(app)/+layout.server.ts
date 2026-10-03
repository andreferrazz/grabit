import { redirect } from '@sveltejs/kit';
import { listLists } from '#lib/server/operations/lists.ts';
import { run } from '#lib/server/operations/registry.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		const next = url.pathname + url.search;
		redirect(303, next === '/' ? '/sign-in' : `/sign-in?next=${encodeURIComponent(next)}`);
	}

	return {
		user: { name: locals.user.name, email: locals.user.email },
		// Shown on the overview and, on wide screens, in the sidebar of every page.
		lists: await run(listLists, locals.user.id, {})
	};
};
