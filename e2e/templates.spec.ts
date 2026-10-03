import {
	addItem,
	createList,
	createTemplate,
	expect,
	newAccount,
	saved,
	signUp,
	test
} from './fixtures.ts';

test('E2E-041 a template is created and its items are added, renamed and deleted', async ({
	page
}) => {
	await signUp(page);
	await createTemplate(page, 'Packing', ['Passport', 'Charger', 'Socks']);
	const items = page.getByRole('list', { name: 'Template items' }).getByRole('listitem');

	await page.getByRole('link', { name: 'Edit Charger' }).click();
	await page.getByLabel('Item name').fill('USB-C charger');
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(items).toHaveText(['Passport', 'USB-C charger', 'Socks']);

	await page.getByRole('button', { name: 'Delete Passport' }).click();
	await expect(items).toHaveText(['USB-C charger', 'Socks']);
	await page.getByRole('button', { name: 'Undo' }).click();
	await expect(items).toHaveText(['Passport', 'USB-C charger', 'Socks']);

	await page.getByRole('button', { name: 'Delete Socks' }).click();
	await saved(page);
	await page.reload();
	await expect(items).toHaveText(['Passport', 'USB-C charger']);

	await page.goto('/templates');
	await expect(
		page.getByRole('list', { name: 'Your templates' }).getByRole('listitem')
	).toContainText(['Packing']);
	await expect(page.getByRole('list', { name: 'Your templates' })).toContainText('2 items');
});

test('E2E-042 a list is created from a template page with every item unchecked', async ({
	page
}) => {
	await signUp(page);
	await createTemplate(page, 'Groceries', ['Milk', 'Eggs']);

	await page.getByRole('button', { name: 'New list from this template' }).click();
	await expect(page).toHaveURL(/\/lists\/[0-9a-f-]{36}$/);
	await expect(page.getByRole('heading', { name: 'Groceries', level: 1 })).toBeVisible();
	await expect(page.getByRole('list', { name: 'To do' }).getByRole('checkbox')).toHaveText([
		'Milk',
		'Eggs'
	]);

	// The list is a copy: checking its items leaves the template alone.
	await page.getByRole('checkbox', { name: 'Milk' }).click();
	await saved(page);
	await page.goto('/templates');
	await page.getByRole('button', { name: 'New list from Groceries' }).click();
	await expect(page.getByRole('list', { name: 'To do' }).getByRole('checkbox')).toHaveText([
		'Milk',
		'Eggs'
	]);
});

test('E2E-043 the lists overview offers templates as one-tap starting points', async ({ page }) => {
	await signUp(page);
	await createTemplate(page, 'Packing', ['Passport']);

	await page.goto('/');
	const starters = page.getByRole('group', { name: 'Start from a template' });
	await starters.getByRole('button', { name: 'Packing' }).click();

	await expect(page.getByRole('heading', { name: 'Packing', level: 1 })).toBeVisible();
	await expect(page.getByRole('checkbox', { name: 'Passport' })).not.toBeChecked();
});

test('E2E-044 a list is saved as a template from its options menu', async ({ page }) => {
	await signUp(page);
	await createList(page, 'Camping');
	await addItem(page, 'Tent');
	await addItem(page, 'Stove');
	await page.getByRole('checkbox', { name: 'Tent' }).click();
	await saved(page);

	await page.getByLabel('List options').click();
	await page.getByRole('button', { name: 'Save as template' }).click();

	await expect(page).toHaveURL(/\/templates\/[0-9a-f-]{36}$/);
	await expect(page.getByRole('heading', { name: 'Camping', level: 1 })).toBeVisible();
	await expect(page.getByRole('list', { name: 'Template items' }).getByRole('listitem')).toHaveText(
		['Tent', 'Stove']
	);
});

test('E2E-045 a template is renamed and deleted from its options menu', async ({ page }) => {
	await signUp(page);
	await createTemplate(page, 'Old template');

	await page.getByLabel('Template options').click();
	await page.getByLabel('Template name').fill('New template');
	await page.getByRole('button', { name: 'Rename' }).click();
	await expect(page.getByRole('heading', { name: 'New template', level: 1 })).toBeVisible();
	await saved(page);

	await page.getByLabel('Template options').click();
	await page.getByText('Delete template…').click();
	await page.getByRole('button', { name: 'Delete permanently' }).click();
	await expect(page).toHaveURL(/\/templates$/);
	await expect(page.getByText('No templates yet')).toBeVisible();
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('E2E-046 templates work as plain form posts', async ({ page }) => {
		const account = newAccount();
		await page.goto('/sign-up');
		await page.getByLabel('Name').fill(account.name);
		await page.getByLabel('Email').fill(account.email);
		await page.getByLabel('Password').fill(account.password);
		await page.getByRole('button', { name: 'Create account' }).click();

		await page.goto('/templates');
		await page.getByLabel('New template name').fill('No scripts');
		await page.getByRole('button', { name: 'Create' }).click();
		await page.getByLabel('Add an item').fill('First');
		await page.getByRole('button', { name: 'Add item' }).click();
		await page.getByLabel('Add an item').fill('Second');
		await page.getByRole('button', { name: 'Add item' }).click();

		await page.getByRole('link', { name: 'Edit First' }).click();
		await page.getByLabel('Item name').fill('First, renamed');
		await page.getByRole('button', { name: 'Save' }).click();
		await page.getByRole('button', { name: 'Delete Second' }).click();
		await expect(
			page.getByRole('list', { name: 'Template items' }).getByRole('listitem')
		).toHaveText(['First, renamed']);

		await page.getByRole('button', { name: 'New list from this template' }).click();
		await expect(page.getByRole('checkbox')).toHaveText(['First, renamed']);
	});
});
