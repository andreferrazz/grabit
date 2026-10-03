import { test as base, expect, type Browser, type Page } from '@playwright/test';

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
function visitorHeaders() {
	return { 'x-forwarded-proto': 'http', 'x-forwarded-for': randomAddress() };
}

/** A second, separate visitor (own cookies, own address) for tests about two users. */
export async function otherVisitor(browser: Browser, baseURL: string | undefined): Promise<Page> {
	const context = await browser.newContext({ baseURL, extraHTTPHeaders: visitorHeaders() });
	return context.newPage();
}

export const test = base.extend({
	// eslint-disable-next-line no-empty-pattern -- Playwright requires the destructuring form
	extraHTTPHeaders: async ({}, use) => {
		await use(visitorHeaders());
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

export async function createList(page: Page, name: string): Promise<void> {
	await page.goto('/');
	await page.getByLabel('New list name').fill(name);
	await page.getByRole('button', { name: 'Create' }).click();
	await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
}

export async function addItem(page: Page, name: string): Promise<void> {
	await page.getByLabel('Add an item').fill(name);
	await page.getByLabel('Add an item').press('Enter');
	await expect(page.getByRole('checkbox', { name, exact: true })).toBeVisible();
}

/** Waits until the app has no change still being saved. */
export async function saved(page: Page): Promise<void> {
	await page.waitForLoadState('networkidle');
}

export async function createTemplate(
	page: Page,
	name: string,
	items: string[] = []
): Promise<void> {
	await page.goto('/templates');
	await page.getByLabel('New template name').fill(name);
	await page.getByRole('button', { name: 'Create' }).click();
	await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
	for (const item of items) {
		await page.getByLabel('Add an item').fill(item);
		await page.getByLabel('Add an item').press('Enter');
		await expect(page.getByRole('listitem').filter({ hasText: item })).toBeVisible();
	}
	await saved(page);
}
