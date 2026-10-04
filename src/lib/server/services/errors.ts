export type ServiceErrorCode = 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT';

/** A failure the caller caused and can be told about. Anything else is a bug and surfaces as a 500. */
export class ServiceError extends Error {
	constructor(
		public code: ServiceErrorCode,
		message: string,
		public details?: unknown
	) {
		super(message);
		this.name = 'ServiceError';
	}
}

/** Postgres unique-violation, e.g. a client-chosen id that already exists. */
export function isUniqueViolation(error: unknown): boolean {
	const code = (error as { code?: string; cause?: { code?: string } } | null)?.code;
	const causeCode = (error as { cause?: { code?: string } } | null)?.cause?.code;
	return code === '23505' || causeCode === '23505';
}
