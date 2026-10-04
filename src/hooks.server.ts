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

const formContentTypes = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];
const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

// OAuth endpoints that other servers call directly, with a form-encoded body and no
// Origin header. They authenticate the caller themselves and use no cookie.
const oauthBackchannel = ['token', 'register', 'revoke', 'introspect'].map(
	(name) => `/api/auth/oauth2/${name}`
);

/** Routes for agents, scripts and OAuth clients: no ambient cookie is trusted there. */
function isApiRoute(pathname: string): boolean {
	return (
		pathname.startsWith('/api/v1/') || pathname === '/mcp' || oauthBackchannel.includes(pathname)
	);
}

/**
 * Cross-site request forgery check for the pages: a form submission must come
 * from this site. This is SvelteKit's own rule (disabled in vite.config.ts),
 * applied everywhere except the API routes.
 */
const handleCsrf: Handle = ({ event, resolve }) => {
	const { request, url } = event;
	const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
	const isForm = !contentType || formContentTypes.includes(contentType);

	if (
		mutatingMethods.includes(request.method) &&
		isForm &&
		!isApiRoute(url.pathname) &&
		request.headers.get('origin') !== url.origin
	) {
		return new Response(`Cross-site ${request.method} form submissions are forbidden`, {
			status: 403
		});
	}

	return resolve(event);
};

/** Applies a theme forced in Settings before the page paints, so there is no flash. */
const handleTheme: Handle = ({ event, resolve }) => {
	const theme = event.cookies.get('theme');
	const attribute = theme === 'light' || theme === 'dark' ? `data-theme="${theme}"` : '';

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%theme%', attribute)
	});
};

export const handle: Handle = sequence(handleCsrf, handleTheme, handleBetterAuth);
