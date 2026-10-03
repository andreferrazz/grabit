import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '#lib/server/auth.ts';
import { oauthContinuation, safeNext, text } from '#lib/server/forms.ts';
import { allow, authLimits, TOO_MANY_ATTEMPTS } from '#lib/server/rate-limit.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		const email = text(data, 'email');
		const password = data.get('password')?.toString() ?? '';

		const { max, windowMs } = authLimits.signIn;
		if (!allow(`sign-in:${event.getClientAddress()}`, max, windowMs)) {
			return fail(429, { email, message: TOO_MANY_ATTEMPTS });
		}

		try {
			await auth.api.signInEmail({ body: { email, password } });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { email, message: 'Invalid email or password.' });
			}
			throw error;
		}

		redirect(303, oauthContinuation(event.url) ?? safeNext(event.url.searchParams.get('next')));
	}
};
