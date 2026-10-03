import type { Handle } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

/** Applies a theme forced in Settings before the page paints, so there is no flash. */
const handleTheme: Handle = ({ event, resolve }) => {
	const theme = event.cookies.get('theme');
	const attribute = theme === 'light' || theme === 'dark' ? `data-theme="${theme}"` : '';

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%theme%', attribute)
	});
};

export const handle: Handle = sequence(handleTheme, handleBetterAuth);
