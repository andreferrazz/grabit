import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '#lib/server/auth.ts';
import { oauthContinuation, text } from '#lib/server/forms.ts';
import { allow, authLimits, TOO_MANY_ATTEMPTS } from '#lib/server/rate-limit.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		const name = text(data, 'name');
		const email = text(data, 'email');
		const password = data.get('password')?.toString() ?? '';

		const { max, windowMs } = authLimits.signUp;
		if (!allow(`sign-up:${event.getClientAddress()}`, max, windowMs)) {
			return fail(429, { name, email, message: TOO_MANY_ATTEMPTS });
		}

		if (!name) return fail(400, { name, email, message: 'Please enter your name.' });

		try {
			await auth.api.signUpEmail({ body: { name, email, password } });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, {
					name,
					email,
					message: error.message || 'Could not create the account.'
				});
			}
			throw error;
		}

		redirect(303, oauthContinuation(event.url) ?? '/');
	}
};
