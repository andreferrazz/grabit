import type { RequestHandler } from './$types';
import { handleApi } from '#lib/server/api/router.ts';

const handler: RequestHandler = (event) => handleApi(event, `/${event.params.path}`);

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
