import { expect, test } from '@playwright/test';

const loginPath = '/demo/better-auth/login';

function newAccount(project: string) {
	const id = `${project}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	return { name: `Tester ${id}`, email: `${id}@example.test`, password: 'correct-horse-battery' };
}

test('E2E-001 sign up creates an account and starts a session', async ({ page }, testInfo) => {
	const account = newAccount(testInfo.project.name);

	await page.goto(loginPath);
	await page.getByLabel('Email').fill(account.email);
	await page.getByLabel('Password').fill(account.password);
	await page.getByLabel('Name (for registration)').fill(account.name);
	await page.getByRole('button', { name: 'Register' }).click();

	await expect(page.getByRole('heading', { name: `Hi, ${account.name}!` })).toBeVisible();
});

test('E2E-002 sign out ends the session and sign in restores it', async ({ page }, testInfo) => {
	const account = newAccount(testInfo.project.name);

	await page.goto(loginPath);
	await page.getByLabel('Email').fill(account.email);
	await page.getByLabel('Password').fill(account.password);
	await page.getByLabel('Name (for registration)').fill(account.name);
	await page.getByRole('button', { name: 'Register' }).click();
	await expect(page.getByRole('heading', { name: `Hi, ${account.name}!` })).toBeVisible();

	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page).toHaveURL(new RegExp(`${loginPath}$`));

	// A signed-out visitor is sent back to the login page.
	await page.goto('/demo/better-auth');
	await expect(page).toHaveURL(new RegExp(`${loginPath}$`));

	await page.getByLabel('Email').fill(account.email);
	await page.getByLabel('Password').fill(account.password);
	await page.getByRole('button', { name: 'Login' }).click();
	await expect(page.getByRole('heading', { name: `Hi, ${account.name}!` })).toBeVisible();
});

test('E2E-003 sign in with a wrong password is refused', async ({ page }, testInfo) => {
	const account = newAccount(testInfo.project.name);

	await page.goto(loginPath);
	await page.getByLabel('Email').fill(account.email);
	await page.getByLabel('Password').fill(account.password);
	await page.getByLabel('Name (for registration)').fill(account.name);
	await page.getByRole('button', { name: 'Register' }).click();
	await page.getByRole('button', { name: 'Sign out' }).click();

	await page.getByLabel('Email').fill(account.email);
	await page.getByLabel('Password').fill('not-the-password');
	await page.getByRole('button', { name: 'Login' }).click();

	await expect(page.getByText('Invalid email or password')).toBeVisible();
	await expect(page).toHaveURL(new RegExp(`${loginPath}`));
});
