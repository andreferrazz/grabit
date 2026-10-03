import type { RequestEvent } from '@sveltejs/kit';
import { operations } from '#lib/server/operations/index.ts';
import { run, type Operation } from '#lib/server/operations/registry.ts';
import { authenticate } from './authenticate.ts';
import { errorResponse, fromError, json } from './respond.ts';

type Route = { operation: Operation; pattern: RegExp; params: string[] };

const routes: Route[] = operations.map((operation) => {
	const params: string[] = [];
	const source = operation.rest.path.replace(/:([A-Za-z]+)/g, (_, param: string) => {
		params.push(param);
		return '([^/]+)';
	});
	return { operation, pattern: new RegExp(`^${source}$`), params };
});

/** Serves `/api/v1/*` by finding the operation whose method and path match. */
export async function handleApi(event: RequestEvent, path: string): Promise<Response> {
	const method = event.request.method;
	const matches = routes
		.map((route) => ({ route, match: route.pattern.exec(path) }))
		.filter((candidate) => candidate.match);

	if (matches.length === 0) return errorResponse(404, 'NOT_FOUND', 'No such endpoint.');

	const found = matches.find(({ route }) => route.operation.rest.method === method);
	if (!found) {
		const allow = matches.map(({ route }) => route.operation.rest.method).join(', ');
		return errorResponse(405, 'METHOD_NOT_ALLOWED', `Use ${allow}.`, undefined, { allow });
	}

	const caller = await authenticate(event);
	if (!caller) {
		return errorResponse(401, 'UNAUTHENTICATED', 'Sign in or send an API token.', undefined, {
			'www-authenticate': 'Bearer'
		});
	}

	let body: Record<string, unknown> = {};
	if (method !== 'GET' && method !== 'DELETE') {
		// Browsers cannot send cross-site JSON without a preflight, so requiring it
		// keeps a signed-in session from being driven by another site's form.
		if (!event.request.headers.get('content-type')?.includes('application/json')) {
			return errorResponse(
				415,
				'UNSUPPORTED_MEDIA_TYPE',
				'Send a JSON body with Content-Type: application/json.'
			);
		}
		try {
			const parsed: unknown = await event.request.json();
			if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
			body = parsed as Record<string, unknown>;
		} catch {
			return errorResponse(400, 'VALIDATION', 'The body must be a JSON object.');
		}
	}

	const { route, match } = found;
	const pathParams = Object.fromEntries(
		route.params.map((param, index) => [param, decodeURIComponent(match![index + 1])])
	);

	try {
		const result = await run(route.operation, caller.userId, { ...body, ...pathParams });
		return json(result, route.operation.rest.status ?? 200);
	} catch (error) {
		return fromError(error);
	}
}
