import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { ORIGIN } from '$app/env/private';
import { auth } from '#lib/server/auth.ts';
import { text } from '#lib/server/forms.ts';
import { requireUserId } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request }) => {
	const { apiKeys } = await auth.api.listApiKeys({ headers: request.headers });

	return {
		origin: ORIGIN,
		tokens: apiKeys
			.map((key) => ({
				id: key.id,
				name: key.name ?? 'Unnamed token',
				// The first characters only; the full token is never stored.
				start: key.start ?? '',
				createdAt: key.createdAt,
				lastUsedAt: key.lastRequest
			}))
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
	};
};

export const actions: Actions = {
	createToken: async (event) => {
		const userId = requireUserId(event);
		const name = text(await event.request.formData(), 'name');
		if (!name)
			return fail(400, {
				tokenError: 'Give the token a name, such as the agent that will use it.'
			});
		if (name.length > 32) return fail(400, { tokenError: 'At most 32 characters.' });

		try {
			const created = await auth.api.createApiKey({ body: { name, userId } });
			// The only time the full token leaves the server.
			return { createdToken: { name, key: created.key } };
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { tokenError: error.message || 'Could not create the token.' });
			}
			throw error;
		}
	},

	revokeToken: async (event) => {
		requireUserId(event);
		const keyId = text(await event.request.formData(), 'id');

		try {
			// Checked against the session, so one user cannot revoke another's token.
			await auth.api.deleteApiKey({ body: { keyId }, headers: event.request.headers });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { tokenError: error.message || 'Could not revoke the token.' });
			}
			throw error;
		}
	},

	signOut: async (event) => {
		await auth.api.signOut({ headers: event.request.headers });
		redirect(303, '/sign-in');
	}
};
