import { addItem, createList, expect, newAccount, saved, signUp, test } from './fixtures.ts';

test('E2E-023 a new list opens empty and appears on the overview', async ({ page }) => {
	await signUp(page);
	await createList(page, 'Weekend trip');

	await expect(page).toHaveURL(/\/lists\/[0-9a-f-]{36}$/);
	await expect(page.getByText('This list is empty')).toBeVisible();

	await page.goto('/');
	const card = page.getByRole('link', { name: /Weekend trip/ }).last();
	await expect(card).toContainText('No items');
});

test('E2E-024 items are added with Enter and the field stays ready for the next one', async ({
	page
}) => {
	await signUp(page);
	await createList(page, 'Groceries');

	await addItem(page, 'Milk');
	await expect(page.getByLabel('Add an item')).toHaveValue('');
	await expect(page.getByLabel('Add an item')).toBeFocused();
	await addItem(page, 'Eggs');
	await addItem(page, 'Bread');

	await saved(page);
	await page.reload();
	const todo = page.getByRole('list', { name: 'To do' });
	await expect(todo.getByRole('checkbox')).toHaveText(['Milk', 'Eggs', 'Bread']);
});

test('E2E-025 checking an item moves it to Done, updates progress and persists', async ({
	page
}) => {
	await signUp(page);
	await createList(page, 'Groceries');
	await addItem(page, 'Milk');
	await addItem(page, 'Eggs');

	await page.getByRole('checkbox', { name: 'Milk' }).click();
	await expect(page.getByRole('list', { name: 'Done' }).getByRole('checkbox')).toHaveText(['Milk']);
	await expect(page.getByRole('checkbox', { name: 'Milk' })).toBeChecked();
	await expect(page.getByTestId('progress-text')).toHaveText('1 of 2');

	await saved(page);
	await page.reload();
	await expect(page.getByRole('checkbox', { name: 'Milk' })).toBeChecked();

	await page.getByRole('checkbox', { name: 'Milk' }).click();
	await expect(page.getByRole('list', { name: 'To do' }).getByRole('checkbox')).toHaveText([
		'Milk',
		'Eggs'
	]);
	await page.getByRole('checkbox', { name: 'Milk' }).click();
	await page.getByRole('checkbox', { name: 'Eggs' }).click();
	await expect(page.getByTestId('progress-text')).toHaveText('All done');
});

test('E2E-026 an item is renamed in place', async ({ page }) => {
	await signUp(page);
	await createList(page, 'Groceries');
	await addItem(page, 'Milk');

	await page.getByRole('link', { name: 'Edit Milk' }).click();
	await page.getByLabel('Item name').fill('Oat milk');
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('checkbox', { name: 'Oat milk' })).toBeVisible();

	await page.getByRole('link', { name: 'Edit Oat milk' }).click();
	await page.getByLabel('Item name').fill('Changed my mind');
	await page.getByRole('link', { name: 'Cancel' }).click();
	await expect(page.getByRole('checkbox', { name: 'Oat milk' })).toBeVisible();

	await saved(page);
	await page.reload();
	await expect(page.getByRole('checkbox', { name: 'Oat milk' })).toBeVisible();
});

test('E2E-027 a deleted item can be brought back with Undo, in its place', async ({ page }) => {
	await signUp(page);
	await createList(page, 'Groceries');
	await addItem(page, 'Milk');
	await addItem(page, 'Eggs');
	await addItem(page, 'Bread');

	await page.getByRole('button', { name: 'Delete Eggs' }).click();
	await expect(page.getByRole('checkbox', { name: 'Eggs' })).toHaveCount(0);
	await expect(page.getByRole('status')).toContainText('Deleted “Eggs”');

	await page.getByRole('button', { name: 'Undo' }).click();
	const todo = page.getByRole('list', { name: 'To do' });
	await expect(todo.getByRole('checkbox')).toHaveText(['Milk', 'Eggs', 'Bread']);

	await saved(page);
	await page.reload();
	await expect(todo.getByRole('checkbox')).toHaveText(['Milk', 'Eggs', 'Bread']);

	await page.getByRole('button', { name: 'Delete Bread' }).click();
	await saved(page);
	await page.reload();
	await expect(todo.getByRole('checkbox')).toHaveText(['Milk', 'Eggs']);
});

test('E2E-028 pasting several lines adds one item per line', async ({ page }) => {
	await signUp(page);
	await createList(page, 'Packing');

	await page.getByLabel('Add an item').focus();
	await page.evaluate(() => {
		const data = new DataTransfer();
		data.setData('text', 'Passport\n  Charger  \n\nSocks');
		document.activeElement?.dispatchEvent(
			new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
		);
	});

	const todo = page.getByRole('list', { name: 'To do' });
	await expect(todo.getByRole('checkbox')).toHaveText(['Passport', 'Charger', 'Socks']);
	await saved(page);
	await page.reload();
	await expect(todo.getByRole('checkbox')).toHaveText(['Passport', 'Charger', 'Socks']);
});

test('E2E-029 a list is renamed and deleted from its options menu', async ({ page }) => {
	await signUp(page);
	await createList(page, 'Old name');

	await page.getByLabel('List options').click();
	await page.getByLabel('List name').fill('New name');
	await page.getByRole('button', { name: 'Rename' }).click();
	await expect(page.getByRole('heading', { name: 'New name', level: 1 })).toBeVisible();
	await saved(page);
	await page.reload();
	await expect(page.getByRole('heading', { name: 'New name', level: 1 })).toBeVisible();

	await page.getByLabel('List options').click();
	await page.getByText('Delete list…').click();
	await page.getByRole('button', { name: 'Delete permanently' }).click();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByText('No lists yet')).toBeVisible();
});

test('E2E-030 Uncheck all resets a list and Remove checked items clears the done ones', async ({
	page
}) => {
	await signUp(page);
	await createList(page, 'Routine');
	await addItem(page, 'Stretch');
	await addItem(page, 'Water');
	await page.getByRole('checkbox', { name: 'Stretch' }).click();
	await page.getByRole('checkbox', { name: 'Water' }).click();
	await expect(page.getByTestId('progress-text')).toHaveText('All done');

	await page.getByLabel('List options').click();
	await page.getByRole('button', { name: 'Uncheck all' }).click();
	await expect(page.getByRole('list', { name: 'To do' }).getByRole('checkbox')).toHaveCount(2);

	await page.getByRole('checkbox', { name: 'Stretch' }).click();
	await page.getByLabel('List options').click();
	await page.getByRole('button', { name: 'Remove checked items' }).click();
	await expect(page.getByRole('checkbox')).toHaveText(['Water']);

	await saved(page);
	await page.reload();
	await expect(page.getByRole('checkbox')).toHaveText(['Water']);
});

test("E2E-031 overview cards show each list's progress", async ({ page }) => {
	await signUp(page);
	await createList(page, 'Groceries');
	await addItem(page, 'Milk');
	await addItem(page, 'Eggs');
	await page.getByRole('checkbox', { name: 'Milk' }).click();
	await saved(page);

	await page.goto('/');
	const card = page
		.getByRole('list', { name: 'Your lists' })
		.getByRole('link', { name: /Groceries/ });
	await expect(card).toContainText('1 of 2');
	await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');

	await card.click();
	await page.getByRole('checkbox', { name: 'Eggs' }).click();
	await saved(page);
	await page.goto('/');
	await expect(card).toContainText('All done');
});

test('E2E-032 a save that fails is undone on screen and reported', async ({ page }) => {
	await signUp(page);
	await createList(page, 'Groceries');
	await addItem(page, 'Milk');
	await saved(page);

	await page.route('**/lists/*?/toggle', (route) => route.abort());
	await page.getByRole('checkbox', { name: 'Milk' }).click();

	await expect(page.getByRole('status')).toContainText('Could not save');
	await expect(page.getByRole('checkbox', { name: 'Milk' })).not.toBeChecked();
});

test('E2E-033 a list that does not exist shows a not-found page', async ({ page }) => {
	await signUp(page);

	const response = await page.goto('/lists/00000000-0000-4000-8000-000000000000');
	expect(response?.status()).toBe(404);
	await expect(page.getByText('List not found')).toBeVisible();
});

test('E2E-034 list pages are rendered on the server with their items', async ({ page }) => {
	await signUp(page);
	await createList(page, 'Server rendered');
	await addItem(page, 'Visible without scripts');
	await saved(page);

	const html = await (await page.request.get(page.url())).text();
	expect(html).toContain('Server rendered');
	expect(html).toContain('Visible without scripts');
});

test('E2E-035 on wide screens the sidebar links to every list', async ({ page, isMobile }) => {
	test.skip(isMobile, 'The sidebar is only shown on wide screens.');
	await signUp(page);
	await createList(page, 'First list');
	await createList(page, 'Second list');

	const sidebar = page.getByRole('navigation', { name: 'Your lists' });
	await sidebar.getByRole('link', { name: 'First list' }).click();
	await expect(page.getByRole('heading', { name: 'First list', level: 1 })).toBeVisible();
	await expect(sidebar.getByRole('link', { name: 'First list' })).toHaveAttribute(
		'aria-current',
		'page'
	);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('E2E-036 lists and items work as plain form posts', async ({ page }) => {
		const account = newAccount();
		await page.goto('/sign-up');
		await page.getByLabel('Name').fill(account.name);
		await page.getByLabel('Email').fill(account.email);
		await page.getByLabel('Password').fill(account.password);
		await page.getByRole('button', { name: 'Create account' }).click();

		await page.getByLabel('New list name').fill('No scripts');
		await page.getByRole('button', { name: 'Create' }).click();
		await expect(page.getByRole('heading', { name: 'No scripts', level: 1 })).toBeVisible();

		await page.getByLabel('Add an item').fill('Milk');
		await page.getByRole('button', { name: 'Add item' }).click();
		await page.getByLabel('Add an item').fill('Eggs');
		await page.getByRole('button', { name: 'Add item' }).click();
		await expect(page.getByRole('checkbox')).toHaveText(['Milk', 'Eggs']);

		await page.getByRole('checkbox', { name: 'Milk' }).click();
		await expect(page.getByRole('checkbox', { name: 'Milk' })).toBeChecked();

		await page.getByRole('link', { name: 'Edit Eggs' }).click();
		await expect(page).toHaveURL(/\?edit=/);
		await page.getByLabel('Item name').fill('Free-range eggs');
		await page.getByRole('button', { name: 'Save' }).click();
		await expect(page).not.toHaveURL(/\?edit=/);
		await expect(page.getByRole('checkbox', { name: 'Free-range eggs' })).toBeVisible();

		await page.getByRole('button', { name: 'Delete Milk' }).click();
		await expect(page.getByRole('checkbox')).toHaveText(['Free-range eggs']);
	});
});
