import { z } from 'zod';
import { ServiceError } from '#lib/server/services/errors.ts';

export type RestMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * One thing a user can do, defined once. The pages call it directly; the REST
 * routes, the OpenAPI document and the MCP tools are all generated from it, so
 * the three can never disagree about names, inputs or behaviour.
 */
export type Operation<Input extends z.ZodType = z.ZodType, Output = unknown> = {
	/** snake_case; also the MCP tool name and the OpenAPI operationId. */
	name: string;
	/** What it does, written for an AI agent choosing a tool. */
	description: string;
	input: Input;
	handler: (userId: string, input: z.output<Input>) => Promise<Output>;
	/** Path parameters (`:listId`) are filled from, and removed from, the input. */
	rest: { method: RestMethod; path: string; status?: 200 | 201 };
	/** Hints for MCP clients. */
	readOnly?: boolean;
	destructive?: boolean;
};

export function defineOperation<Input extends z.ZodType, Output>(
	operation: Operation<Input, Output>
): Operation<Input, Output> {
	return operation;
}

/** Validates raw input against the operation's schema, then runs it for the user. */
export async function run<Input extends z.ZodType, Output>(
	operation: Operation<Input, Output>,
	userId: string,
	rawInput: unknown
): Promise<Output> {
	const parsed = operation.input.safeParse(rawInput);
	if (!parsed.success) {
		throw new ServiceError(
			'VALIDATION',
			parsed.error.issues[0]?.message ?? 'Invalid input.',
			parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
		);
	}
	return operation.handler(userId, parsed.data);
}
