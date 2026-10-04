import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';

/** Liveness probe for the container: healthy only when the database answers. */
export async function GET() {
	try {
		await db.execute(sql`select 1`);
		return Response.json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
	} catch {
		return Response.json(
			{ status: 'unavailable' },
			{ status: 503, headers: { 'cache-control': 'no-store' } }
		);
	}
}
