import { error, fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

const scopeDescriptions: Record<string, string> = {
	openid: 'Know who you are',
	profile: 'See your name',
	email: 'See your email address',
	offline_access: 'Stay connected until you remove its access'
};

export const load: PageServerLoad = async ({ locals, url, request }) => {
	// The authorization server sends people here; without a session they sign in first.
	if (!locals.user) redirect(303, `/sign-in${url.search}`);

	const clientId = url.searchParams.get('client_id');
	if (!clientId || !url.searchParams.has('sig')) error(400, 'This approval link is not valid.');

	let client;
	try {
		client = await auth.api.getOAuthClientPublic({
			query: { client_id: clientId },
			headers: request.headers
		});
	} catch (cause) {
		// Better Auth's plugins throw their own copy of APIError, so match by name.
		if (cause instanceof APIError || (cause as Error)?.name === 'APIError') {
			error(400, 'The app asking for access is not known.');
		}
		throw cause;
	}

	const redirectUri = url.searchParams.get('redirect_uri');
	const scopes = (url.searchParams.get('scope') ?? '').split(' ').filter(Boolean);

	return {
		// The signed request, posted back with the decision so it can be verified again.
		oauthQuery: url.search.slice(1),
		client: {
			name: client.client_name ?? 'An app',
			// Where the visitor is sent afterwards: the clearest sign of who is asking.
			host: redirectUri ? new URL(redirectUri).host : null
		},
		user: { email: locals.user.email },
		permissions: [
			'Read and change your lists and templates',
			...scopes.map((scope) => scopeDescriptions[scope]).filter(Boolean)
		]
	};
};

async function decide(event: Parameters<Actions['allow']>[0], accept: boolean) {
	const oauthQuery = (await event.request.formData()).get('oauth_query')?.toString() ?? '';
	if (!event.locals.user) redirect(303, `/sign-in?${oauthQuery}`);

	// Sent through Better Auth's request handler rather than auth.api: approving
	// re-runs the authorization step, which needs a real request to work from.
	const response = await auth.handler(
		new Request(new URL('/api/auth/oauth2/consent', event.url), {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				cookie: event.request.headers.get('cookie') ?? '',
				origin: event.url.origin
			},
			body: JSON.stringify({ accept, oauth_query: oauthQuery })
		})
	);
	const result = (await response.json().catch(() => null)) as { url?: string } | null;
	const destination = result?.url;

	if (!response.ok || !destination) {
		console.error('OAuth consent failed:', response.status, result);
		return fail(400, {
			message: 'This approval request has expired. Start again from the app you were connecting.'
		});
	}

	// Back to the app that asked, with a one-time code (or with the refusal). The
	// address is the client's registered redirect URI, checked by the authorization server.
	redirect(303, destination, { external: true });
}

export const actions: Actions = {
	allow: (event) => decide(event, true),
	deny: (event) => decide(event, false)
};
