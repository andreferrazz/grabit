import { z } from 'zod';
import { operations } from '#lib/server/operations/index.ts';

type JsonSchema = {
	type?: string;
	properties?: Record<string, unknown>;
	required?: string[];
	[key: string]: unknown;
};

const errorSchema = {
	type: 'object',
	properties: {
		error: {
			type: 'object',
			properties: {
				code: { type: 'string' },
				message: { type: 'string' },
				details: {}
			},
			required: ['code', 'message']
		}
	},
	required: ['error']
};

const errorResponse = (description: string) => ({
	description,
	content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
});

/** Builds the OpenAPI 3.1 description of `/api/v1` from the operation registry. */
export function openApiDocument(origin: string) {
	const paths: Record<string, Record<string, unknown>> = {};

	for (const operation of operations) {
		const { method, path, status = 200 } = operation.rest;
		const pathParams = [...path.matchAll(/:([A-Za-z]+)/g)].map((match) => match[1]);
		const schema = z.toJSONSchema(operation.input, {
			io: 'input',
			unrepresentable: 'any'
		}) as JsonSchema;
		const properties = { ...schema.properties };

		const parameters = pathParams.map((param) => {
			const paramSchema = properties[param];
			delete properties[param];
			return { name: param, in: 'path', required: true, schema: paramSchema ?? { type: 'string' } };
		});
		const required = (schema.required ?? []).filter((key) => !pathParams.includes(key));
		const hasBody = method !== 'GET' && method !== 'DELETE';

		const openApiPath = path.replace(/:([A-Za-z]+)/g, '{$1}');
		paths[openApiPath] ??= {};
		paths[openApiPath][method.toLowerCase()] = {
			operationId: operation.name,
			summary: operation.description,
			...(parameters.length > 0 && { parameters }),
			...(hasBody && {
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { type: 'object', properties, ...(required.length > 0 && { required }) }
						}
					}
				}
			}),
			responses: {
				[status]: {
					description: 'The result as JSON.',
					content: { 'application/json': { schema: {} } }
				},
				400: errorResponse('The input was not valid.'),
				401: errorResponse('The API token is missing or not valid.'),
				404: errorResponse('The list, template or item does not exist.'),
				...(method === 'POST' && { 409: errorResponse('The chosen id already exists.') }),
				429: errorResponse('Too many requests with this token.')
			}
		};
	}

	return {
		openapi: '3.1.0',
		info: {
			title: 'Grabit API',
			version: '1',
			description:
				'Checklists and reusable templates. Authenticate with a personal API token from Settings, sent as `Authorization: Bearer <token>`. Send JSON bodies with `Content-Type: application/json`. The same operations are available as MCP tools at `/mcp`.'
		},
		servers: [{ url: `${origin}/api/v1` }],
		security: [{ bearerAuth: [] }],
		paths,
		components: {
			securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
			schemas: { Error: errorSchema }
		}
	};
}
