import type { RequestHandler } from './$types';
import { authenticate } from '#lib/server/api/authenticate.ts';
import { mcpHandler } from '#lib/server/mcp/server.ts';

const handler: RequestHandler = async (event) => {
	// Tokens only: a browser session cookie is never accepted here.
	const caller = await authenticate(event, { allowSession: false });

	if (!caller.ok) {
		const limited = caller.reason === 'rate_limited';
		return Response.json(
			{
				error: limited ? 'rate_limited' : 'unauthorized',
				message: limited
					? 'Too many requests with this token. Slow down.'
					: 'Send a Grabit API token as Authorization: Bearer <token>.'
			},
			{
				status: limited ? 429 : 401,
				// MCP clients start their sign-in when they see this header on a 401.
				headers: limited ? {} : { 'www-authenticate': 'Bearer realm="grabit"' }
			}
		);
	}

	return mcpHandler.fetch(event.request, {
		authInfo: {
			token: caller.token ?? '',
			clientId: 'api-token',
			scopes: [],
			extra: { userId: caller.userId }
		}
	});
};

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
