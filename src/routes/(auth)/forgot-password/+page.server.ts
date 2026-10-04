import { fail } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.ts';
import { text } from '#lib/server/forms.ts';
import { allow, authLimits, TOO_MANY_ATTEMPTS } from '#lib/server/rate-limit.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		const email = text(data, 'email');

		const { max, windowMs } = authLimits.passwordReset;
		if (!allow(`password-reset:${event.getClientAddress()}`, max, windowMs)) {
			return fail(429, { message: TOO_MANY_ATTEMPTS });
		}

		try {
			await auth.api.requestPasswordReset({ body: { email } });
		} catch (error) {
			// The reply is the same whether or not the address has an account, so a
			// failure here must not change what the visitor sees.
			console.error('Password reset request failed', error);
		}

		return { sent: true };
	}
};
