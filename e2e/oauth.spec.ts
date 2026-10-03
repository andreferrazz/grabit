import { createHash, randomBytes } from 'node:crypto';
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, newAccount, signIn, signOut, signUp, test } from './fixtures.ts';

/**
 * These tests play the part of an MCP client such as claude.ai: discover the
 * authorization server, register, send the user to sign in and approve, swap
 * the code for a token, and call /mcp with it.
 */
const callback = 'https://client.example.test/callback';

const base64url = (bytes: Buffer) => bytes.toString('base64url');

async function registerClient(request: APIRequestContext, name = 'Test MCP client') {
	const response = await request.post('/api/auth/oauth2/register', {
		data: {
			client_name: name,
			redirect_uris: [callback],
			token_endpoint_auth_method: 'none',
			grant_types: ['authorization_code', 'refresh_token'],
			response_types: ['code']
		}
	});
	expect(response.status(), await response.text()).toBeLessThan(300);
	return (await response.json()).client_id as string;
}

function authorizeUrl(baseURL: string, clientId: string, verifier: string) {
	const challenge = base64url(createHash('sha256').update(verifier).digest());
	const query = new URLSearchParams({
		response_type: 'code',
		client_id: clientId,
		redirect_uri: callback,
		code_challenge: challenge,
		code_challenge_method: 'S256',
		state: 'state-from-client',
		scope: 'openid offline_access',
		resource: `${baseURL}/mcp`
	});
	return `/api/auth/oauth2/authorize?${query}`;
}

/**
 * Presses Allow or Deny and returns the address the user is sent back to. The
 * client's site does not exist, so the request to it is observed rather than loaded.
 */
async function decide(page: Page, button: 'Allow' | 'Deny'): Promise<URL> {
	const back = page.waitForRequest((request) => request.url().startsWith(callback));
	await page.getByRole('button', { name: button }).click();
	return new URL((await back).url());
}

async function exchangeCode(
	request: APIRequestContext,
	baseURL: string,
	clientId: string,
	code: string,
	verifier: string
) {
	const response = await request.post('/api/auth/oauth2/token', {
		form: {
			grant_type: 'authorization_code',
			code,
			redirect_uri: callback,
			client_id: clientId,
			code_verifier: verifier,
			resource: `${baseURL}/mcp`
		}
	});
	expect(response.status(), await response.text()).toBe(200);
	return (await response.json()) as { access_token: string; refresh_token?: string };
}

async function mcpToolsList(request: APIRequestContext, accessToken: string) {
	return request.post('/mcp', {
		headers: {
			authorization: `Bearer ${accessToken}`,
			accept: 'application/json, text/event-stream',
			'mcp-protocol-version': '2025-06-18'
		},
		data: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
	});
}

test('E2E-067 MCP clients can discover how to sign in', async ({ request, baseURL }) => {
	const challenge = await request.post('/mcp', {
		data: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
	});
	expect(challenge.status()).toBe(401);
	expect(challenge.headers()['www-authenticate']).toContain(
		`resource_metadata="${baseURL}/.well-known/oauth-protected-resource/mcp"`
	);

	const resource = await (await request.get('/.well-known/oauth-protected-resource/mcp')).json();
	expect(resource.resource).toBe(`${baseURL}/mcp`);
	expect(resource.authorization_servers).toEqual([`${baseURL}/api/auth`]);

	for (const path of [
		'/.well-known/oauth-authorization-server/api/auth',
		'/.well-known/oauth-authorization-server'
	]) {
		const server = await (await request.get(path)).json();
		expect(server.issuer, path).toBe(`${baseURL}/api/auth`);
		expect(server.authorization_endpoint).toBe(`${baseURL}/api/auth/oauth2/authorize`);
		expect(server.token_endpoint).toBe(`${baseURL}/api/auth/oauth2/token`);
		expect(server.registration_endpoint).toBe(`${baseURL}/api/auth/oauth2/register`);
		expect(server.code_challenge_methods_supported).toContain('S256');
		expect(server.client_id_metadata_document_supported).toBe(true);
	}
});

test('E2E-068 a signed-in user approves a client, which then uses MCP on their behalf', async ({
	page,
	request,
	baseURL
}) => {
	const account = await signUp(page);
	await page.request.post('/api/v1/lists', { data: { name: 'Visible to the client' } });
	const clientId = await registerClient(request, 'Claude');
	const verifier = base64url(randomBytes(32));

	await page.goto(authorizeUrl(baseURL!, clientId, verifier));
	await expect(page.getByRole('heading', { name: 'Connect Claude?' })).toBeVisible();
	await expect(page.getByText(account.email)).toBeVisible();
	await expect(page.getByText('client.example.test')).toBeVisible();
	await expect(page.getByRole('list', { name: 'Permissions' })).toContainText(
		'Read and change your lists and templates'
	);

	const landed = await decide(page, 'Allow');
	expect(landed.searchParams.get('state')).toBe('state-from-client');
	const code = landed.searchParams.get('code');
	expect(code).toBeTruthy();

	const tokens = await exchangeCode(request, baseURL!, clientId, code!, verifier);
	expect(tokens.refresh_token).toBeTruthy();

	const tools = await mcpToolsList(request, tokens.access_token);
	expect(tools.status(), await tools.text()).toBe(200);
	expect(await tools.text()).toContain('list_lists');

	const call = await request.post('/mcp', {
		headers: {
			authorization: `Bearer ${tokens.access_token}`,
			accept: 'application/json, text/event-stream',
			'mcp-protocol-version': '2025-06-18'
		},
		data: {
			jsonrpc: '2.0',
			id: 2,
			method: 'tools/call',
			params: { name: 'list_lists', arguments: {} }
		}
	});
	expect(await call.text()).toContain('Visible to the client');

	// A code works once.
	const replay = await request.post('/api/auth/oauth2/token', {
		form: {
			grant_type: 'authorization_code',
			code: code!,
			redirect_uri: callback,
			client_id: clientId,
			code_verifier: verifier,
			resource: `${baseURL}/mcp`
		}
	});
	expect(replay.status()).toBeGreaterThanOrEqual(400);
});

test('E2E-069 a signed-out user is taken through sign-in, then approval, then back to the client', async ({
	page,
	request,
	baseURL
}) => {
	const account = await signUp(page);
	await signOut(page);
	const clientId = await registerClient(request);
	const verifier = base64url(randomBytes(32));

	await page.goto(authorizeUrl(baseURL!, clientId, verifier));
	await expect(page).toHaveURL(/\/sign-in\?/);
	await expect(page.getByText('Sign in to connect an app')).toBeVisible();

	await signIn(page, account.email, account.password);
	await expect(page.getByRole('heading', { name: 'Connect Test MCP client?' })).toBeVisible();
	const code = (await decide(page, 'Allow')).searchParams.get('code');
	const tokens = await exchangeCode(request, baseURL!, clientId, code!, verifier);
	expect((await mcpToolsList(request, tokens.access_token)).status()).toBe(200);
});

test('E2E-070 a new user can create their account in the middle of connecting a client', async ({
	page,
	request,
	baseURL
}) => {
	const account = newAccount();
	const clientId = await registerClient(request);
	const verifier = base64url(randomBytes(32));

	await page.goto(authorizeUrl(baseURL!, clientId, verifier));
	await page.getByRole('link', { name: 'Create an account' }).click();
	await page.getByLabel('Name').fill(account.name);
	await page.getByLabel('Email').fill(account.email);
	await page.getByLabel('Password').fill(account.password);
	await page.getByRole('button', { name: 'Create account' }).click();

	await expect(page.getByRole('heading', { name: 'Connect Test MCP client?' })).toBeVisible();
	expect((await decide(page, 'Allow')).searchParams.get('code')).toBeTruthy();
});

test('E2E-071 denying sends the user back to the client without a code', async ({
	page,
	request,
	baseURL
}) => {
	await signUp(page);
	const clientId = await registerClient(request);

	await page.goto(authorizeUrl(baseURL!, clientId, base64url(randomBytes(32))));
	const landed = await decide(page, 'Deny');
	expect(landed.searchParams.get('error')).toBe('access_denied');
	expect(landed.searchParams.get('code')).toBeNull();
});

test('E2E-072 /mcp refuses tokens that are forged or were not issued for it', async ({
	request
}) => {
	const garbage = await mcpToolsList(request, 'not-a-token');
	expect(garbage.status()).toBe(401);
	expect(garbage.headers()['www-authenticate']).toContain('Bearer');

	// A well-formed JWT signed by someone else.
	const header = base64url(Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: 'nope' })));
	const payload = base64url(
		Buffer.from(JSON.stringify({ sub: 'someone', exp: Math.floor(Date.now() / 1000) + 600 }))
	);
	const forged = await mcpToolsList(request, `${header}.${payload}.${base64url(randomBytes(64))}`);
	expect(forged.status()).toBe(401);
});

test('E2E-073 a refresh token yields a new access token that works', async ({
	page,
	request,
	baseURL
}) => {
	await signUp(page);
	const clientId = await registerClient(request);
	const verifier = base64url(randomBytes(32));
	await page.goto(authorizeUrl(baseURL!, clientId, verifier));
	const code = (await decide(page, 'Allow')).searchParams.get('code');
	const tokens = await exchangeCode(request, baseURL!, clientId, code!, verifier);

	const refreshed = await request.post('/api/auth/oauth2/token', {
		form: {
			grant_type: 'refresh_token',
			refresh_token: tokens.refresh_token!,
			client_id: clientId,
			resource: `${baseURL}/mcp`
		}
	});
	expect(refreshed.status(), await refreshed.text()).toBe(200);
	const next = await refreshed.json();
	expect((await mcpToolsList(request, next.access_token)).status()).toBe(200);
});
