/** Reads a text field from a submitted form, trimmed. Missing fields read as ''. */
export function text(data: FormData, name: string): string {
	const value = data.get(name);
	return typeof value === 'string' ? value.trim() : '';
}

/** Only same-site paths are accepted as a post-sign-in destination. */
export function safeNext(next: string | null): string {
	return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
