import { expect, newAccount, signIn, signOut, signUp, test } from './fixtures.ts';

test('E2E-001 sign up creates an account and starts a session', async ({ page }) => {
	const account = await signUp(page);

	await expect(page).toHaveURL(/\/$/);
	await page.goto('/settings');
	await expect(page.getByText(account.email)).toBeVisible();
});

test('E2E-002 sign out ends the session and sign in restores it', async ({ page }) => {
	const account = await signUp(page);
	await signOut(page);

	await page.goto('/settings');
	await expect(page).toHaveURL(/\/sign-in\?next=%2Fsettings$/);

	await signIn(page, account.email, account.password);
	await expect(page.getByText(account.email)).toBeVisible();
});

test('E2E-003 sign in with a wrong password is refused', async ({ page }) => {
	const account = await signUp(page);
	await signOut(page);

	await signIn(page, account.email, 'not-the-password');

	await expect(page.getByRole('alert')).toHaveText('Invalid email or password.');
	await expect(page).toHaveURL(/\/sign-in/);
	await expect(page.getByLabel('Email')).toHaveValue(account.email);
});

test('E2E-004 a signed-out visitor is sent to sign in and back to the page they asked for', async ({
	page
}) => {
	const account = await signUp(page);
	await signOut(page);

	await page.goto('/templates');
	await expect(page).toHaveURL(/\/sign-in\?next=%2Ftemplates$/);

	await signIn(page, account.email, account.password);
	await expect(page).toHaveURL(/\/templates$/);
	await expect(page.getByRole('heading', { name: 'Templates', level: 1 })).toBeVisible();
});

test('E2E-005 sign up with an email that already has an account is refused', async ({ page }) => {
	const account = await signUp(page);
	await signOut(page);

	await page.goto('/sign-up');
	await page.getByLabel('Name').fill('Someone Else');
	await page.getByLabel('Email').fill(account.email);
	await page.getByLabel('Password').fill('another-password');
	await page.getByRole('button', { name: 'Create account' }).click();

	await expect(page.getByRole('alert')).toBeVisible();
	await expect(page).toHaveURL(/\/sign-up/);
});

test('E2E-006 a signed-in user is sent away from the sign-in page', async ({ page }) => {
	await signUp(page);

	await page.goto('/sign-in');
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { name: 'Lists', level: 1 })).toBeVisible();
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('E2E-007 sign up, sign out and sign in work as plain form posts', async ({ page }) => {
		const account = newAccount();

		await page.goto('/sign-up');
		await page.getByLabel('Name').fill(account.name);
		await page.getByLabel('Email').fill(account.email);
		await page.getByLabel('Password').fill(account.password);
		await page.getByRole('button', { name: 'Create account' }).click();
		await expect(page.getByRole('heading', { name: 'Lists', level: 1 })).toBeVisible();

		await page.goto('/settings');
		await page.getByRole('button', { name: 'Sign out' }).click();
		await expect(page).toHaveURL(/\/sign-in$/);

		await signIn(page, account.email, account.password);
		await expect(page.getByRole('heading', { name: 'Lists', level: 1 })).toBeVisible();
	});
});
