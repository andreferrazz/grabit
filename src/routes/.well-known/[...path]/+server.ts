import {
	oauthProviderAuthServerMetadata,
	oauthProviderOpenIdConfigMetadata
} from '@better-auth/oauth-provider';
import type { RequestHandler } from './$types';
import { auth } from '#lib/server/auth.ts';

const authServerMetadata = oauthProviderAuthServerMetadata(auth);
const openIdConfiguration = oauthProviderOpenIdConfigMetadata(auth);

/**
 * OAuth discovery documents. MCP clients look for them at the site root
 * (RFC 8414, RFC 9728), while Better Auth is mounted under /api/auth. Root
 * requests are handed to it here; it answers the paths it knows. Older clients
 * ask for the authorization-server document without the /api/auth suffix, so
 * those two paths are answered explicitly.
 */
export const GET: RequestHandler = ({ request, params }) => {
	if (params.path === 'oauth-authorization-server') return authServerMetadata(request);
	if (params.path === 'openid-configuration') return openIdConfiguration(request);
	return auth.handler(request);
};
