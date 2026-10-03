/**
 * Fixed-window rate limiter kept in memory. The app runs as a single replica, so
 * one process sees every request; a second replica would need shared storage.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

/** Returns true when the caller is still within `max` attempts per `windowMs`. */
export function allow(key: string, max: number, windowMs: number): boolean {
	const now = Date.now();
	const entry = windows.get(key);

	if (!entry || entry.resetAt <= now) {
		windows.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}

	entry.count += 1;
	return entry.count <= max;
}

// Drop expired windows so the map cannot grow without bound.
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of windows) {
		if (entry.resetAt <= now) windows.delete(key);
	}
}, 60_000).unref();

const MINUTE = 60_000;

/** Limits for the unauthenticated auth forms, per client address. */
export const authLimits = {
	signIn: { max: 10, windowMs: 5 * MINUTE },
	signUp: { max: 5, windowMs: 60 * MINUTE },
	passwordReset: { max: 5, windowMs: 60 * MINUTE }
} as const;

export const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a few minutes and try again.';
