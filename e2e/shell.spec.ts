import { addItem, createList, expect, signUp, test } from './fixtures.ts';

test('E2E-011 the navigation reaches Lists, Templates and Settings and marks the current one', async ({
	page
}) => {
	await signUp(page);
	const nav = page.getByRole('navigation', { name: 'Main' });

	await expect(nav.getByRole('link', { name: 'Lists' })).toHaveAttribute('aria-current', 'page');

	await nav.getByRole('link', { name: 'Templates' }).click();
	await expect(page.getByRole('heading', { name: 'Templates', level: 1 })).toBeVisible();
	await expect(nav.getByRole('link', { name: 'Templates' })).toHaveAttribute(
		'aria-current',
		'page'
	);

	await nav.getByRole('link', { name: 'Settings' }).click();
	await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();

	await nav.getByRole('link', { name: 'Lists' }).click();
	await expect(page.getByRole('heading', { name: 'Lists', level: 1 })).toBeVisible();
});

test('E2E-012 too many sign-in attempts from one address are blocked', async ({ page }) => {
	await page.goto('/sign-in');

	// Each attempt waits for the server's answer, so the attempts are counted one by one.
	async function attempt(n: number) {
		await page.getByLabel('Email').fill('nobody@example.test');
		await page.getByLabel('Password').fill(`wrong-${n}`);
		const answered = page.waitForResponse((response) => response.request().method() === 'POST');
		await page.getByRole('button', { name: 'Sign in' }).click();
		await answered;
	}

	for (let n = 1; n <= 10; n++) {
		await attempt(n);
		await expect(page.getByRole('alert')).toHaveText('Invalid email or password.');
	}

	await attempt(11);
	await expect(page.getByRole('alert')).toContainText('Too many attempts');
});

test('E2E-013 the health endpoint reports ok when the database answers', async ({ request }) => {
	const response = await request.get('/healthz');

	expect(response.status()).toBe(200);
	expect(await response.json()).toEqual({ status: 'ok' });
});

test('E2E-022 a form post from another site is refused', async ({ request }) => {
	const form = { email: 'someone@example.test', password: 'whatever-it-is' };

	const crossSite = await request.post('/sign-in', {
		form,
		headers: { origin: 'https://evil.example' }
	});
	expect(crossSite.status()).toBe(403);

	const noOrigin = await request.post('/sign-in', { form });
	expect(noOrigin.status()).toBe(403);
});

test('E2E-074 responses carry the security headers and a content security policy', async ({
	request
}) => {
	const response = await request.get('/sign-in');
	const headers = response.headers();

	expect(headers['x-content-type-options']).toBe('nosniff');
	expect(headers['x-frame-options']).toBe('DENY');
	expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

	const csp = headers['content-security-policy'];
	expect(csp).toContain("default-src 'self'");
	expect(csp).toContain("frame-ancestors 'none'");
	expect(csp).toContain("object-src 'none'");
	expect(csp).toMatch(/script-src 'self'[^;]*'nonce-/);
});

test('E2E-075 the app runs under its content security policy without violations', async ({
	page
}) => {
	const violations: string[] = [];
	page.on('console', (message) => {
		if (message.text().includes('Content Security Policy')) violations.push(message.text());
	});

	await signUp(page);
	await createList(page, 'Under CSP');
	await addItem(page, 'Milk');
	await page.getByRole('checkbox', { name: 'Milk' }).click();
	await expect(page.getByRole('list', { name: 'Done' }).getByRole('checkbox')).toHaveText(['Milk']);
	await page.goto('/templates');
	await page.goto('/settings');
	await page.getByRole('button', { name: 'Dark' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	expect(violations).toEqual([]);
});

test('E2E-076 a signed-in browser is rate limited on the API', async ({ page }) => {
	test.slow();
	await signUp(page);

	const statuses = new Set<number>();
	for (let batch = 0; batch < 7; batch++) {
		const responses = await Promise.all(
			Array.from({ length: 50 }, () => page.request.get('/api/v1/lists'))
		);
		for (const response of responses) statuses.add(response.status());
	}

	expect([...statuses].sort()).toEqual([200, 429]);
});
