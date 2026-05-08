import { PUBLIC_API_BASE_URL } from '$env/static/public';
import type { ApiError } from '$lib/types';

export class ApiClientError extends Error {
	status: number;
	constructor(status: number, message: string) {
		super(message);
		this.name = 'ApiClientError';
		this.status = status;
	}
}

const baseUrl = PUBLIC_API_BASE_URL.replace(/\/$/, '');

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const headers = new Headers(init.headers);
	if (init.body && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}
	headers.set('Accept', 'application/json');

	let response: Response;
	try {
		response = await fetch(`${baseUrl}${path}`, { ...init, headers });
	} catch (err) {
		throw new ApiClientError(0, err instanceof Error ? err.message : 'Network error');
	}

	if (!response.ok) {
		let message = `Request failed with status ${response.status}`;
		try {
			const body = (await response.json()) as Partial<ApiError>;
			if (body?.message) message = body.message;
		} catch {
			/* ignore JSON parse errors */
		}
		throw new ApiClientError(response.status, message);
	}

	if (response.status === 204) return undefined as T;
	return (await response.json()) as T;
}
