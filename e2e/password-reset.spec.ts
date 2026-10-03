import { expect, signIn, signOut, signUp, test } from './fixtures.ts';
import { mailCount, readMail } from './mail.ts';

test('E2E-008 password reset by email replaces the password', async ({ page }) => {
	const account = await signUp(page);
	await signOut(page);

	await page.goto('/forgot-password');
	await page.getByLabel('Email').fill(account.email);
	await page.getByRole('button', { name: 'Send reset link' }).click();
	await expect(page.getByRole('status')).toContainText('a reset link is on its way');

	const mail = await readMail(account.email);
	const link = mail.match(/http\S+\/reset-password\?token=\S+/)?.[0];
	expect(link, 'the email contains a reset link').toBeTruthy();

	await page.goto(new URL(link!).pathname + new URL(link!).search);
	await page.getByLabel('New password').fill('a-brand-new-password');
	await page.getByRole('button', { name: 'Change password' }).click();
	await expect(page).toHaveURL(/\/sign-in\?reset/);
	await expect(page.getByRole('status')).toContainText('Your password was changed');

	await signIn(page, account.email, account.password);
	await expect(page.getByRole('alert')).toHaveText('Invalid email or password.');

	await signIn(page, account.email, 'a-brand-new-password');
	await expect(page.getByRole('heading', { name: 'Lists', level: 1 })).toBeVisible();
});

test('E2E-009 a reset request for an unknown address looks the same and sends nothing', async ({
	page
}) => {
	const unknown = `nobody-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;

	await page.goto('/forgot-password');
	await page.getByLabel('Email').fill(unknown);
	await page.getByRole('button', { name: 'Send reset link' }).click();

	await expect(page.getByRole('status')).toContainText('a reset link is on its way');
	expect(await mailCount(unknown)).toBe(0);
});

test('E2E-010 a reset link with a bad token is refused', async ({ page }) => {
	await page.goto('/reset-password?token=not-a-real-token');
	await page.getByLabel('New password').fill('a-brand-new-password');
	await page.getByRole('button', { name: 'Change password' }).click();

	await expect(page.getByRole('alert')).toContainText('invalid or has expired');
});
