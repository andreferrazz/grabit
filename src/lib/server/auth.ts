import { ORIGIN, BETTER_AUTH_SECRET } from '$app/env/private';
import { apiKey } from '@better-auth/api-key';
import { cimd } from '@better-auth/cimd';
import { fetchClientMetadataResource } from '@better-auth/cimd/node';
import { mcp } from '@better-auth/mcp';
import { jwt } from 'better-auth/plugins';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '#lib/server/db/index.ts';
import { sendMail } from '#lib/server/mail.ts';

/** The address MCP clients connect to; OAuth access tokens are valid for it alone. */
export const mcpResource = `${ORIGIN}/mcp`;

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
		// Personal API tokens for agents and scripts. A token only identifies its owner to
		// /api/v1 and /mcp; it never becomes a browser session (enableSessionForAPIKeys is
		// off), so a leaked token cannot change the password or create more tokens.
		apiKey({
			defaultPrefix: 'grabit_',
			// The plugin's own default is 10 requests a day, far too low for an agent.
			rateLimit: { enabled: true, timeWindow: 60_000, maxRequests: 120 }
		}),
		// OAuth 2.1 sign-in for MCP clients such as claude.ai, which cannot be given a
		// pasted token. Access tokens are signed JWTs bound to the /mcp resource.
		jwt(),
		mcp({
			loginPage: '/sign-in',
			consentPage: '/oauth/consent',
			resource: mcpResource,
			// Older MCP clients register themselves (RFC 7591); newer ones identify with a
			// Client ID Metadata Document, handled by cimd() below.
			allowDynamicClientRegistration: true,
			allowUnauthenticatedClientRegistration: true
		}),
		cimd({ fetchClientMetadataResource, metadataProfile: 'mcp-2026-07-28' }),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
