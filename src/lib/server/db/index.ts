import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.ts';
import { DATABASE_URL } from '$app/env/private';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(DATABASE_URL, {
	max: 10,
	// Close connections that sit unused. Container networks (Docker Swarm's overlay among
	// them) silently drop idle TCP connections after a while, and a query sent down a
	// dropped connection fails or hangs. Short-lived idle connections never get that old.
	idle_timeout: 30,
	// Recycle every connection regularly for the same reason.
	max_lifetime: 30 * 60,
	// Fail fast when the database cannot be reached, instead of leaving the page loading.
	connect_timeout: 10
});

export const db = drizzle(client, { schema });
