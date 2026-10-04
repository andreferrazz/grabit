// Applies the SQL migrations in ./drizzle to DATABASE_URL.
// Runs on container start in production and before the end-to-end tests.
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

export async function runMigrations(databaseUrl) {
	const client = postgres(databaseUrl, { max: 1, onnotice: () => {} });
	try {
		await migrate(drizzle(client), { migrationsFolder: './drizzle' });
	} finally {
		await client.end();
	}
}

if (import.meta.main) {
	if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
	await runMigrations(process.env.DATABASE_URL);
	console.log('Migrations applied.');
}
