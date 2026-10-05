/** Reads a text field from a submitted form, trimmed. Missing fields read as ''. */
export function text(data: FormData, name: string): string {
	const value = data.get(name);
	return typeof value === 'string' ? value.trim() : '';
}

/** Only same-site paths are accepted as a post-sign-in destination. */
export function safeNext(next: string | null): string {
	return next && next.startsWith('/') && !next.startsWith('//') ? next : '/open';
}

/**
 * When sign-in was requested by an OAuth client (an MCP client connecting), the
 * authorization server sends the visitor to the sign-in page with its signed
 * request in the query string. After sign-in they go back to it to continue.
 */
export function oauthContinuation(url: URL): string | null {
	const isOAuthRequest = url.searchParams.has('client_id') && url.searchParams.has('sig');
	return isOAuthRequest ? `/api/auth/oauth2/authorize${url.search}` : null;
}
