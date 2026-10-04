import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { ServiceError } from '#lib/server/services/errors.ts';

/** The signed-in user's id. Form actions do not run the layout guard, so each one calls this. */
export function requireUserId(event: RequestEvent): string {
	if (!event.locals.user) redirect(303, '/sign-in');
	return event.locals.user.id;
}

const statusByCode = { VALIDATION: 400, NOT_FOUND: 404, CONFLICT: 409 } as const;

/** Runs the work of a form action; a ServiceError becomes a failure the page can show. */
export async function attempt(work: () => Promise<unknown>) {
	try {
		await work();
	} catch (error) {
		if (error instanceof ServiceError) {
			return fail(statusByCode[error.code], { message: error.message });
		}
		throw error;
	}
}
