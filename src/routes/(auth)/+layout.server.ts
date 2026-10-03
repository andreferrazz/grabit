import { redirect } from '@sveltejs/kit';
import { oauthContinuation } from '#lib/server/forms.ts';
import type { LayoutServerLoad } from './$types';

// Pages a signed-in user may still need: a reset link, and approving an OAuth client.
const openToSignedIn = ['/(auth)/reset-password', '/(auth)/oauth/consent'];

export const load: LayoutServerLoad = ({ locals, route, url }) => {
	if (locals.user && !openToSignedIn.includes(route.id ?? '')) {
		// Already signed in: go straight on with the OAuth request, or to the app.
		redirect(303, oauthContinuation(url) ?? '/');
	}

	// Sign-in and sign-up link to each other; an OAuth request must survive the hop.
	return { oauthQuery: oauthContinuation(url) ? url.search : '' };
};
