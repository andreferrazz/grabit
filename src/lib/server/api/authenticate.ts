import type { RequestEvent } from '@sveltejs/kit';

/** Who is calling the API. Today: the signed-in browser session. */
export async function authenticate(event: RequestEvent): Promise<{ userId: string } | null> {
	if (event.locals.user) return { userId: event.locals.user.id };
	return null;
}
