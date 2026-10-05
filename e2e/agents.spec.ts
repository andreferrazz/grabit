import type { APIRequestContext, Page } from '@playwright/test';
import { addItem, createList, expect, saved, signUp, test } from './fixtures.ts';

const api = '/api/v1';

/** Creates a token in Settings and returns it as shown, once, on the page. */
async function createToken(page: Page, name = 'Test agent'): Promise<string> {
	await page.goto('/settings');
	await page.getByLabel('Token name').fill(name);
	await page.getByRole('button', { name: 'Create token' }).click();
	await expect(page.getByText(`Token “${name}” created`)).toBeVisible();
	const token = (await page.getByLabel('new token', { exact: true }).textContent())?.trim() ?? '';
	expect(token).toMatch(/^grabit_/);
	return token;
}

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/** One MCP JSON-RPC call over HTTP, the way an MCP client makes it. */
async function mcp(
	request: APIRequestContext,
	token: string,
	method: string,
	params: Record<string, unknown> = {}
) {
	const response = await request.post('/mcp', {
		headers: {
			...bearer(token),
			accept: 'application/json, text/event-stream',
			'mcp-protocol-version': '2025-06-18'
		},
		data: { jsonrpc: '2.0', id: 1, method, params }
	});
	const body = await response.text();
	expect(response.status(), body).toBe(200);
	// The reply is plain JSON or a one-message event stream; MCP clients accept both.
	const json = response.headers()['content-type']?.includes('text/event-stream')
		? (body
				.split('\n')
				.find((line) => line.startsWith('data: '))
				?.slice(6) ?? '')
		: body;
	const message = JSON.parse(json);
	if (message.error) throw new Error(message.error.message);
	return message.result;
}

async function callTool(
	request: APIRequestContext,
	token: string,
	name: string,
	args: Record<string, unknown> = {}
) {
	const result = await mcp(request, token, 'tools/call', { name, arguments: args });
	return { isError: result.isError === true, text: result.content[0].text as string };
}

test('E2E-047 a token made in Settings is shown once and works as a Bearer token', async ({
	page,
	request
}) => {
	await signUp(page);
	await createList(page, 'From the browser');
	const token = await createToken(page);

	const lists = await request.get(`${api}/lists`, { headers: bearer(token) });
	expect(lists.status()).toBe(200);
	expect((await lists.json()).map((list: { name: string }) => list.name)).toEqual([
		'From the browser'
	]);

	const created = await request.post(`${api}/lists`, {
		headers: bearer(token),
		data: { name: 'From a script', items: ['One'] }
	});
	expect(created.status()).toBe(201);

	// After a reload only the first characters of the token are shown.
	await page.goto('/settings');
	await expect(page.getByText(token)).toHaveCount(0);
	await expect(page.getByRole('list', { name: 'Your tokens' })).toContainText('Test agent');
});

test('E2E-048 an invalid or revoked token is refused', async ({ page, request }) => {
	await signUp(page);
	const token = await createToken(page);

	const wrong = await request.get(`${api}/lists`, { headers: bearer('grabit_not-a-real-token') });
	expect(wrong.status()).toBe(401);

	await page.getByRole('button', { name: 'Revoke Test agent' }).click();
	await expect(page.getByRole('list', { name: 'Your tokens' })).toHaveCount(0);

	const revoked = await request.get(`${api}/lists`, { headers: bearer(token) });
	expect(revoked.status()).toBe(401);
	expect((await revoked.json()).error.code).toBe('UNAUTHENTICATED');
});

test('E2E-049 a token cannot be used to open the signed-in pages', async ({ page, request }) => {
	await signUp(page);
	const token = await createToken(page);

	const settings = await request.get('/settings', { headers: bearer(token), maxRedirects: 0 });
	expect(settings.status()).toBe(303);
	expect(settings.headers()['location']).toContain('/sign-in');
});

test('E2E-050 the OpenAPI document is public and describes every endpoint', async ({ request }) => {
	const response = await request.get(`${api}/openapi.json`);
	expect(response.status()).toBe(200);
	const document = await response.json();

	expect(document.openapi).toBe('3.1.0');
	expect(document.paths['/lists'].get.operationId).toBe('list_lists');
	expect(document.paths['/lists'].post.operationId).toBe('create_list');
	expect(document.paths['/lists/{listId}/items/{itemId}'].patch.parameters).toHaveLength(2);
	expect(document.paths['/templates/{templateId}'].delete.operationId).toBe('delete_template');
	expect(document.paths['/lists/{listId}/save-as-template'].post.operationId).toBe(
		'save_list_as_template'
	);
	expect(document.components.securitySchemes.bearerAuth.scheme).toBe('bearer');

	const operationIds = Object.values(document.paths).flatMap((methods) =>
		Object.values(methods as Record<string, { operationId: string }>).map((op) => op.operationId)
	);
	expect(operationIds).toHaveLength(25);
});

test('E2E-051 the MCP endpoint asks for a token and lists the tools', async ({ page, request }) => {
	const anonymous = await request.post('/mcp', {
		data: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
	});
	expect(anonymous.status()).toBe(401);
	expect(anonymous.headers()['www-authenticate']).toContain('Bearer');

	await signUp(page);
	const token = await createToken(page);

	const initialized = await mcp(request, token, 'initialize', {
		protocolVersion: '2025-06-18',
		capabilities: {},
		clientInfo: { name: 'e2e', version: '1' }
	});
	expect(initialized.serverInfo.name).toBe('grabit');
	expect(initialized.instructions).toContain('list_lists');

	const { tools } = await mcp(request, token, 'tools/list');
	const names = tools.map((tool: { name: string }) => tool.name);
	expect(names).toEqual(
		expect.arrayContaining([
			'list_lists',
			'get_list',
			'create_list',
			'add_items',
			'set_items_checked',
			'remove_items',
			'reorder_items',
			'set_default_list',
			'list_templates',
			'create_template',
			'save_list_as_template'
		])
	);
	// The single-item delete tools are left out: remove_items covers them.
	expect(names).not.toContain('remove_item');
	expect(names).toHaveLength(23);

	const createListTool = tools.find((tool: { name: string }) => tool.name === 'create_list');
	expect(createListTool.inputSchema.properties.templateId).toBeDefined();
	const deleteTool = tools.find((tool: { name: string }) => tool.name === 'delete_list');
	expect(deleteTool.annotations.destructiveHint).toBe(true);
});

test('E2E-052 an agent builds and checks off a list over MCP and the UI shows it', async ({
	page,
	request
}) => {
	await signUp(page);
	const token = await createToken(page, 'Claude');

	const template = JSON.parse(
		(
			await callTool(request, token, 'create_template', {
				name: 'Weekly shop',
				items: ['Milk', 'Eggs']
			})
		).text
	);
	const list = JSON.parse(
		(await callTool(request, token, 'create_list', { templateId: template.id, items: ['Bread'] }))
			.text
	);
	expect(list.items.map((item: { name: string }) => item.name)).toEqual(['Milk', 'Eggs', 'Bread']);

	const checked = JSON.parse(
		(
			await callTool(request, token, 'set_items_checked', {
				listId: list.id,
				itemIds: [list.items[0].id, list.items[2].id],
				checked: true
			})
		).text
	);
	expect(checked.checkedCount).toBe(2);

	await page.goto(`/lists/${list.id}`);
	await expect(page.getByRole('heading', { name: 'Weekly shop', level: 1 })).toBeVisible();
	await expect(page.getByRole('list', { name: 'Done' }).getByRole('checkbox')).toHaveText([
		'Milk',
		'Bread'
	]);

	// And the other way round: the agent sees what the person does.
	await addItem(page, 'Coffee');
	await saved(page);
	const seen = JSON.parse((await callTool(request, token, 'get_list', { listId: list.id })).text);
	expect(seen.items.map((item: { name: string }) => item.name)).toContain('Coffee');
});

test('E2E-053 MCP tool failures come back as tool errors, not protocol errors', async ({
	page,
	request
}) => {
	await signUp(page);
	const token = await createToken(page);

	const missing = await callTool(request, token, 'get_list', {
		listId: '00000000-0000-4000-8000-000000000000'
	});
	expect(missing.isError).toBe(true);
	expect(missing.text).toContain('NOT_FOUND');

	const invalid = await mcp(request, token, 'tools/call', {
		name: 'create_list',
		arguments: { name: '' }
	}).catch((error: Error) => ({ isError: true, content: [{ text: error.message }] }));
	expect(invalid.isError).toBe(true);
});

test('E2E-054 the MCP endpoint does not accept a browser session', async ({ page }) => {
	await signUp(page);

	const response = await page.request.post('/mcp', {
		headers: { accept: 'application/json, text/event-stream' },
		data: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
	});
	expect(response.status()).toBe(401);
});

test('E2E-055 Settings shows how to connect an agent to this server', async ({ page, baseURL }) => {
	await signUp(page);
	await page.goto('/settings');

	await expect(page.getByLabel('MCP command', { exact: true })).toContainText(
		`claude mcp add --transport http grabit ${baseURL}/mcp`
	);
	await expect(page.getByLabel('REST example', { exact: true })).toContainText(
		`${baseURL}/api/v1/lists`
	);
	await expect(page.getByRole('link', { name: '/api/v1/openapi.json' })).toBeVisible();
	await expect(page.getByLabel('connector address', { exact: true })).toHaveText(`${baseURL}/mcp`);

	// Once a token exists on the page, the examples carry it, ready to paste.
	const token = await createToken(page);
	await expect(page.getByLabel('MCP command', { exact: true })).toContainText(token);
});
