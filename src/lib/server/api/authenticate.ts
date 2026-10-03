import type { RequestEvent } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.ts';

export type Caller =
	| { ok: true; userId: string; via: 'session' | 'token'; token?: string }
	| { ok: false; reason: 'missing' | 'invalid' | 'rate_limited' };

function bearerToken(request: Request): string | null {
	const header = request.headers.get('authorization');
	if (!header || !/^bearer /i.test(header)) return null;
	return header.slice(7).trim() || null;
}

/**
 * Who is calling: a personal API token in `Authorization: Bearer`, or (where
 * `allowSession` is set) the signed-in browser session.
 */
export async function authenticate(
	event: RequestEvent,
	options: { allowSession: boolean }
): Promise<Caller> {
	const token = bearerToken(event.request);

	if (token) {
		const result = await auth.api.verifyApiKey({ body: { key: token } });
		if (result.valid && result.key) {
			return { ok: true, userId: result.key.referenceId, via: 'token', token };
		}
		const limited = result.error?.code === 'RATE_LIMITED';
		return { ok: false, reason: limited ? 'rate_limited' : 'invalid' };
	}

	if (options.allowSession && event.locals.user) {
		return { ok: true, userId: event.locals.user.id, via: 'session' };
	}

	return { ok: false, reason: 'missing' };
}
