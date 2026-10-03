import { ORIGIN, BETTER_AUTH_SECRET } from '$app/env/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '#lib/server/db/index.ts';
import { sendMail } from '#lib/server/mail.ts';

export const auth = betterAuth({
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		revokeSessionsOnPasswordReset: true,
		sendResetPassword: async ({ user, token }) => {
			const link = `${ORIGIN}/reset-password?token=${encodeURIComponent(token)}`;
			await sendMail({
				to: user.email,
				subject: 'Reset your Grabit password',
				text: [
					`Hi ${user.name},`,
					'',
					'Use this link to choose a new password. It expires in one hour.',
					'',
					link,
					'',
					'If you did not ask for this, you can ignore this email.'
				].join('\n')
			});
		}
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
