import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	if (!locals.user) {
		const next = url.pathname + url.search;
		redirect(303, next === '/' ? '/sign-in' : `/sign-in?next=${encodeURIComponent(next)}`);
	}

	return { user: { name: locals.user.name, email: locals.user.email } };
};
