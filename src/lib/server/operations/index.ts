import { listOperations } from './lists.ts';
import type { Operation } from './registry.ts';
import { templateOperations } from './templates.ts';

/** Every operation the REST API and the MCP server expose. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each entry keeps its own input type where it is defined
export const operations: Operation<any, unknown>[] = [...listOperations, ...templateOperations];
