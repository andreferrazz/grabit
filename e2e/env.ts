import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

/** Environment for the app under test, read from .env.test and nowhere else. */
export const testEnv = parseEnv(readFileSync('.env.test', 'utf8')) as Record<string, string>;

/**
 * The tests delete data, so they must never reach a real database.
 * Refuses any connection string whose database name does not end in `_test`.
 */
export function assertTestDatabase(url: string): void {
	const name = new URL(url).pathname.slice(1);
	if (!name.endsWith('_test')) {
		throw new Error(
			`Refusing to run end-to-end tests against database "${name}": its name must end in "_test".`
		);
	}
}
