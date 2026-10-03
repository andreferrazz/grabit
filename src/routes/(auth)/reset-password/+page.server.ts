import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '#lib/server/auth.ts';
import { allow, authLimits, TOO_MANY_ATTEMPTS } from '#lib/server/rate-limit.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return { hasToken: !!url.searchParams.get('token') };
};

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		const newPassword = data.get('password')?.toString() ?? '';
		const token = event.url.searchParams.get('token') ?? '';

		const { max, windowMs } = authLimits.passwordReset;
		if (!allow(`password-reset:${event.getClientAddress()}`, max, windowMs)) {
			return fail(429, { message: TOO_MANY_ATTEMPTS });
		}

		try {
			await auth.api.resetPassword({ body: { newPassword, token } });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, {
					message:
						error.body?.code === 'INVALID_TOKEN'
							? 'This reset link is invalid or has expired. Request a new one.'
							: error.message || 'Could not change the password.'
				});
			}
			throw error;
		}

		redirect(303, '/sign-in?reset');
	}
};
