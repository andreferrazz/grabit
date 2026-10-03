import postgres from 'postgres';
import { runMigrations } from '../scripts/migrate.mjs';
import { assertTestDatabase, testEnv } from './env.ts';

/** Migrates the test database and empties every table before the run. */
export default async function globalSetup(): Promise<void> {
	const url = testEnv.DATABASE_URL;
	assertTestDatabase(url);

	await runMigrations(url);

	const sql = postgres(url, { max: 1, onnotice: () => {} });
	try {
		const tables = await sql<{ tablename: string }[]>`
			select tablename from pg_tables where schemaname = 'public'`;
		if (tables.length > 0) {
			await sql`truncate ${sql(tables.map((t) => t.tablename))} restart identity cascade`;
		}
	} finally {
		await sql.end();
	}
}
