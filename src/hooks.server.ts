import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';

/** Requests slower than this are logged, so a "it hung, then worked" report leaves a trace. */
const SLOW_MS = 3000;

/**
 * Logs every failure of our own code with a short id. The id is also shown on the
 * error page, so a report from a user can be matched to its log line.
 */
export const handleError: HandleServerError = ({ kind, error, event }) => {
	// Errors thrown on purpose (a 404 for a missing list) and SvelteKit's own
	// (unknown routes) are normal traffic: no id, no stack trace.
	if (kind !== 'unknown') return;
	const errorId = crypto.randomUUID().slice(0, 8);
	console.error(`[error ${errorId}] ${event.request.method} ${event.url.pathname}`, error);
	return { message: 'Internal Error', errorId };
};

/** Logs every request that is slow or answered with a server error. */
const handleRequestLog: Handle = async ({ event, resolve }) => {
	const started = performance.now();
	const response = await resolve(event);
	const ms = Math.round(performance.now() - started);
	if (response.status >= 500 || ms > SLOW_MS) {
		console.warn(
			`[request] ${response.status} ${event.request.method} ${event.url.pathname} ${ms}ms`
		);
	}
	return response;
};

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

/** Headers that tell browsers to be strict with this site's responses. */
const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
	if (event.url.protocol === 'https:') {
		response.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
	}

	return response;
};

export const handle: Handle = sequence(
	handleRequestLog,
	handleSecurityHeaders,
	handleCsrf,
	handleTheme,
	handleBetterAuth
);
