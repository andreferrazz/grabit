import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { operations } from '#lib/server/operations/index.ts';
import { ServiceError } from '#lib/server/services/errors.ts';

const instructions = [
	'Grabit keeps checklists ("lists") and reusable templates for one user.',
	'Call list_lists or list_templates first to find ids; every other tool needs them.',
	'Tools that change a list or template return its full updated state, so there is no need to fetch it again.',
	'To start a list from a template, call create_list with templateId: the items are copied, unchecked.'
].join(' ');

/**
 * The MCP endpoint. Every tool comes from the operation registry, so it has the
 * same name, input and behaviour as the matching REST endpoint. A fresh server
 * is built per request, bound to the user the token belongs to.
 */
export const mcpHandler = createMcpHandler(
	(context) => {
		const userId = context.authInfo?.extra?.userId;
		if (typeof userId !== 'string')
			throw new Error('MCP request reached the server without a user');

		const server = new McpServer(
			{ name: 'grabit', title: 'Grabit', version: '1.0.0' },
			{ instructions }
		);

		for (const operation of operations) {
			if (operation.mcp === false) continue;

			server.registerTool(
				operation.name,
				{
					description: operation.description,
					inputSchema: operation.input,
					annotations: {
						readOnlyHint: operation.readOnly ?? false,
						destructiveHint: operation.destructive ?? false,
						openWorldHint: false
					}
				},
				async (input: unknown) => {
					try {
						const result = await operation.handler(userId, input);
						return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
					} catch (error) {
						if (error instanceof ServiceError) {
							return {
								isError: true,
								content: [{ type: 'text' as const, text: `${error.code}: ${error.message}` }]
							};
						}
						throw error;
					}
				}
			);
		}

		return server;
	},
	// Tools answer in one step, so a plain JSON reply is enough; nothing is streamed.
	{ responseMode: 'json' }
);
