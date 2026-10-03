import { expect, signUp, test } from './fixtures.ts';

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
