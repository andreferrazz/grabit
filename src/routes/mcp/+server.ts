import { createLocalJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { RequestHandler } from './$types';
import { authenticate } from '#lib/server/api/authenticate.ts';
import { auth, mcpResource } from '#lib/server/auth.ts';
import { mcpHandler } from '#lib/server/mcp/server.ts';

const origin = new URL(mcpResource).origin;
const issuer = `${origin}/api/auth`;
const resourceMetadataUrl = `${origin}/.well-known/oauth-protected-resource/mcp`;

// The keys that sign OAuth access tokens, read straight from Better Auth rather than
// fetched from this server's own public URL, so checking a token needs no network.
let keys: { verify: JWTVerifyGetKey; loadedAt: number } | undefined;

async function signingKeys(refresh = false): Promise<JWTVerifyGetKey> {
	if (!keys || refresh || Date.now() - keys.loadedAt > 10 * 60_000) {
		keys = { verify: createLocalJWKSet(await auth.api.getJwks()), loadedAt: Date.now() };
	}
	return keys.verify;
}

/** The user an OAuth access token was issued for, or null when the token is not valid for /mcp. */
async function verifyAccessToken(token: string) {
	const options = { issuer, audience: mcpResource };
	try {
		let payload;
		try {
			({ payload } = await jwtVerify(token, await signingKeys(), options));
		} catch (error) {
			// The signing key may have been rotated since the keys were loaded.
			if ((error as { code?: string }).code !== 'ERR_JWKS_NO_MATCHING_KEY') throw error;
			({ payload } = await jwtVerify(token, await signingKeys(true), options));
		}
		if (typeof payload.sub !== 'string') return null;
		return {
			userId: payload.sub,
			clientId: typeof payload.azp === 'string' ? payload.azp : 'oauth-client',
			scopes: typeof payload.scope === 'string' ? payload.scope.split(' ').filter(Boolean) : []
		};
	} catch {
		return null;
	}
}

function unauthorized(message: string, challenge: string): Response {
	return Response.json(
		{ jsonrpc: '2.0', error: { code: -32000, message }, id: null },
		{ status: 401, headers: { 'www-authenticate': challenge } }
	);
}

const handler: RequestHandler = async (event) => {
	const authorization = event.request.headers.get('authorization') ?? '';
	const bearer = /^bearer /i.test(authorization) ? authorization.slice(7).trim() : '';

	// No credentials: point the client at the discovery document so it can start
	// OAuth sign-in (RFC 9728). A browser session cookie is never accepted here.
	if (!bearer) {
		return unauthorized(
			'Sign in, or send a Grabit API token as Authorization: Bearer <token>.',
			`Bearer resource_metadata="${resourceMetadataUrl}"`
		);
	}

	// Personal API tokens (Claude Code, scripts) are recognisable by their prefix.
	if (bearer.startsWith('grabit_')) {
		const caller = await authenticate(event, { allowSession: false });
		if (!caller.ok) {
			if (caller.reason === 'rate_limited') {
				return Response.json(
					{ error: 'rate_limited', message: 'Too many requests with this token. Slow down.' },
					{ status: 429 }
				);
			}
			return unauthorized('The API token is not valid.', 'Bearer error="invalid_token"');
		}

		return mcpHandler.fetch(event.request, {
			authInfo: {
				token: bearer,
				clientId: 'api-token',
				scopes: [],
				extra: { userId: caller.userId }
			}
		});
	}

	// Anything else is an OAuth access token, used by clients that sign the user in (claude.ai).
	const grant = await verifyAccessToken(bearer);
	if (!grant) {
		return unauthorized(
			'The access token is not valid for this server.',
			`Bearer error="invalid_token", resource_metadata="${resourceMetadataUrl}"`
		);
	}

	return mcpHandler.fetch(event.request, {
		authInfo: {
			token: bearer,
			clientId: grant.clientId,
			scopes: grant.scopes,
			resource: new URL(mcpResource),
			extra: { userId: grant.userId }
		}
	});
};

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
