import { ServiceError, type ServiceErrorCode } from '#lib/server/services/errors.ts';

const statusByCode: Record<ServiceErrorCode, number> = {
	VALIDATION: 400,
	NOT_FOUND: 404,
	CONFLICT: 409
};

const headers = { 'cache-control': 'no-store' };

export function json(body: unknown, status = 200): Response {
	return Response.json(body, { status, headers });
}

export function errorResponse(
	status: number,
	code: string,
	message: string,
	details?: unknown,
	extraHeaders?: Record<string, string>
): Response {
	return Response.json(
		{ error: { code, message, ...(details !== undefined && { details }) } },
		{ status, headers: { ...headers, ...extraHeaders } }
	);
}

/** Maps a thrown error to the API's error envelope. Unknown errors are rethrown as 500s. */
export function fromError(error: unknown): Response {
	if (error instanceof ServiceError) {
		return errorResponse(statusByCode[error.code], error.code, error.message, error.details);
	}
	throw error;
}
