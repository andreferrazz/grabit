import { test as base, expect, type Page } from '@playwright/test';

export { expect };

export type Account = { name: string; email: string; password: string };

function randomAddress(): string {
	const part = () => Math.floor(Math.random() * 254) + 1;
	return `10.${part()}.${part()}.${part()}`;
}

/**
 * Every test talks to the app as a different client address, the way separate
 * visitors would behind the production proxy. This keeps the per-address rate
 * limits from leaking between tests.
 */
export const test = base.extend({
	// eslint-disable-next-line no-empty-pattern -- Playwright requires the destructuring form
	extraHTTPHeaders: async ({}, use) => {
		await use({ 'x-forwarded-proto': 'http', 'x-forwarded-for': randomAddress() });
	}
});

export function newAccount(): Account {
	const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	return { name: `Tester ${id}`, email: `${id}@example.test`, password: 'correct-horse-battery' };
}

export async function signUp(page: Page, account: Account = newAccount()): Promise<Account> {
	await page.goto('/sign-up');
	await page.getByLabel('Name').fill(account.name);
	await page.getByLabel('Email').fill(account.email);
	await page.getByLabel('Password').fill(account.password);
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page.getByRole('heading', { name: 'Lists', level: 1 })).toBeVisible();
	return account;
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function signOut(page: Page): Promise<void> {
	await page.goto('/settings');
	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page).toHaveURL(/\/sign-in$/);
}
