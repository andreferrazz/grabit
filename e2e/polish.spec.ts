import { addItem, createList, createTemplate, expect, saved, signUp, test } from './fixtures.ts';

const todoNames = (page: import('@playwright/test').Page) =>
	page.getByRole('list', { name: 'To do' }).getByRole('checkbox');

test('E2E-056 the app is installable: manifest, icons and theme colour are in place', async ({
	page,
	request
}) => {
	await page.goto('/sign-in');
	await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
		'href',
		'/manifest.webmanifest'
	);
	await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#059669');

	const manifest = await (await request.get('/manifest.webmanifest')).json();
	expect(manifest).toMatchObject({ name: 'Grabit', display: 'standalone', start_url: '/' });
	expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(
		true
	);
	for (const icon of manifest.icons) {
		const response = await request.get(icon.src);
		expect(response.status(), icon.src).toBe(200);
		expect(response.headers()['content-type']).toBe('image/png');
	}
});

test('E2E-057 without a connection the app shows its offline page', async ({ page, context }) => {
	await signUp(page);
	await page.evaluate(() => navigator.serviceWorker.ready);
	// The worker takes control on activation; wait until it does.
	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

	await context.setOffline(true);
	await page.goto('/templates');
	await expect(page.getByRole('heading', { name: "You're offline" })).toBeVisible();

	await context.setOffline(false);
	await page.getByRole('link', { name: 'Try again' }).click();
	await expect(page.getByRole('heading', { name: 'Templates', level: 1 })).toBeVisible();
});

test('E2E-058 the service worker caches app files only, never pages or data', async ({ page }) => {
	await signUp(page);
	await createList(page, 'Private list');
	await page.evaluate(() => navigator.serviceWorker.ready);

	const cached = await page.evaluate(async () => {
		const urls: string[] = [];
		for (const name of await caches.keys()) {
			const cache = await caches.open(name);
			for (const request of await cache.keys()) urls.push(new URL(request.url).pathname);
		}
		return urls;
	});

	expect(cached.length).toBeGreaterThan(5);
	expect(cached).toContain('/offline.html');
	for (const path of cached) {
		expect(path, path).toMatch(/^\/(_app\/|[^/]+\.(png|svg|ico|html|webmanifest|txt)$)/);
	}
	expect(cached).not.toContain('/');
});

test('E2E-059 items are reordered by dragging their handle', async ({ page }) => {
	await signUp(page);
	await createList(page, 'Order matters');
	await addItem(page, 'First');
	await addItem(page, 'Second');
	await addItem(page, 'Third');
	await saved(page);

	const handle = page.getByLabel('Drag Third to reorder');
	const target = page.getByRole('checkbox', { name: 'First' });
	const from = (await handle.boundingBox())!;
	const to = (await target.boundingBox())!;

	await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
	await page.mouse.down();
	await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 10, { steps: 3 });
	await page.mouse.move(from.x + from.width / 2, to.y + 4, { steps: 12 });
	// The drop position follows the pointer a moment later; a person pauses before letting go too.
	await page.waitForTimeout(400);
	await page.mouse.up();

	await expect(todoNames(page)).toHaveText(['Third', 'First', 'Second']);
	await saved(page);
	await page.reload();
	await expect(todoNames(page)).toHaveText(['Third', 'First', 'Second']);
});

test('E2E-060 Alt+arrow keys move the focused item up and down', async ({ page }) => {
	await signUp(page);
	await createList(page, 'Order matters');
	await addItem(page, 'First');
	await addItem(page, 'Second');
	await addItem(page, 'Third');
	await saved(page);

	await page.getByRole('checkbox', { name: 'Third' }).focus();
	await page.keyboard.press('Alt+ArrowUp');
	await expect(todoNames(page)).toHaveText(['First', 'Third', 'Second']);
	await expect(page.getByRole('checkbox', { name: 'Third' })).toBeFocused();
	await page.keyboard.press('Alt+ArrowUp');
	await expect(todoNames(page)).toHaveText(['Third', 'First', 'Second']);
	// Focus follows the item, which is what lets the next key press move it again.
	await expect(page.getByRole('checkbox', { name: 'Third' })).toBeFocused();
	await page.keyboard.press('Alt+ArrowDown');
	await expect(todoNames(page)).toHaveText(['First', 'Third', 'Second']);

	await saved(page);
	await page.reload();
	await expect(todoNames(page)).toHaveText(['First', 'Third', 'Second']);
});

test('E2E-061 a list can be worked entirely from the keyboard', async ({ page }) => {
	await signUp(page);
	await createList(page, 'Keyboard');
	await addItem(page, 'Alpha');
	await addItem(page, 'Beta');
	await addItem(page, 'Gamma');
	await saved(page);
	await page.getByRole('heading', { name: 'Keyboard', level: 1 }).click();

	// j and k walk the items.
	await page.keyboard.press('j');
	await expect(page.getByRole('checkbox', { name: 'Alpha' })).toBeFocused();
	await page.keyboard.press('j');
	await expect(page.getByRole('checkbox', { name: 'Beta' })).toBeFocused();
	await page.keyboard.press('k');
	await expect(page.getByRole('checkbox', { name: 'Alpha' })).toBeFocused();

	// Space checks the focused item.
	await page.keyboard.press('Space');
	await expect(page.getByRole('list', { name: 'Done' }).getByRole('checkbox')).toHaveText([
		'Alpha'
	]);

	// e edits it.
	await page.getByRole('checkbox', { name: 'Beta' }).focus();
	await page.keyboard.press('e');
	await page.getByLabel('Item name').fill('Beta, edited');
	await page.keyboard.press('Enter');
	await expect(page.getByRole('checkbox', { name: 'Beta, edited' })).toBeVisible();

	// Delete removes it; Ctrl+Z brings it back.
	await page.getByRole('checkbox', { name: 'Gamma' }).focus();
	await page.keyboard.press('Delete');
	await expect(page.getByRole('checkbox', { name: 'Gamma' })).toHaveCount(0);
	await page.keyboard.press('Control+z');
	await expect(page.getByRole('checkbox', { name: 'Gamma' })).toBeVisible();

	// n jumps to the composer; typing there does not trigger shortcuts.
	await page.getByRole('heading', { name: 'Keyboard', level: 1 }).click();
	await page.keyboard.press('n');
	await expect(page.getByLabel('Add an item')).toBeFocused();
	await page.keyboard.type('jeans');
	await expect(page.getByLabel('Add an item')).toHaveValue('jeans');
	await page.keyboard.press('Escape');

	// ? opens the list of shortcuts.
	await page.getByRole('heading', { name: 'Keyboard', level: 1 }).click();
	await page.keyboard.press('?');
	await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
	await page.getByRole('button', { name: 'Close' }).click();
	await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeHidden();
});

test('E2E-062 the theme can be forced to dark or light and the server remembers it', async ({
	page
}) => {
	await signUp(page);
	await page.goto('/settings');
	const html = page.locator('html');
	await expect(html).not.toHaveAttribute('data-theme');

	await page.getByRole('button', { name: 'Dark' }).click();
	await expect(html).toHaveAttribute('data-theme', 'dark');
	await expect(page.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
	await saved(page);

	// The server renders the choice into the HTML, so there is no flash on load.
	const raw = await (await page.request.get('/settings')).text();
	expect(raw).toContain('data-theme="dark"');
	const background = await page.evaluate(
		() => getComputedStyle(document.documentElement).backgroundColor
	);
	expect(background).toBe('rgb(15, 19, 23)');

	await page.getByRole('button', { name: 'System' }).click();
	await expect(html).not.toHaveAttribute('data-theme');
	await saved(page);
	await page.reload();
	await expect(html).not.toHaveAttribute('data-theme');
});

test('E2E-063 changes made elsewhere appear when the tab gets focus again', async ({ page }) => {
	await signUp(page);
	await createList(page, 'Shared with an agent');
	await addItem(page, 'Mine');
	await saved(page);
	const listId = page.url().split('/').pop();

	// Something else (another device, an agent) adds an item.
	await page.request.post(`/api/v1/lists/${listId}/items`, { data: { items: ['From elsewhere'] } });
	await expect(page.getByRole('checkbox', { name: 'From elsewhere' })).toHaveCount(0);

	await page.waitForTimeout(2100);
	await page.evaluate(() => window.dispatchEvent(new Event('focus')));
	await expect(page.getByRole('checkbox', { name: 'From elsewhere' })).toBeVisible();
});

test('E2E-064 a slow save shows a Saving indicator until it finishes', async ({ page }) => {
	await signUp(page);
	await createList(page, 'Slow network');
	await addItem(page, 'Milk');
	await saved(page);

	await page.route('**/lists/*?/toggle', async (route) => {
		await new Promise((resolve) => setTimeout(resolve, 1200));
		await route.continue();
	});
	await page.getByRole('checkbox', { name: 'Milk' }).click();

	// The change shows at once; the indicator appears while the request is out.
	await expect(page.getByRole('list', { name: 'Done' }).getByRole('checkbox')).toHaveText(['Milk']);
	await expect(page.getByRole('status', { name: 'Saving' })).toBeVisible();
	await expect(page.getByRole('status', { name: 'Saving' })).toBeHidden();
});

test('E2E-065 template items are reordered with Alt+arrow keys', async ({ page }) => {
	await signUp(page);
	await createTemplate(page, 'Routine', ['Stretch', 'Water', 'Walk']);
	const items = page.getByRole('list', { name: 'Template items' }).getByRole('listitem');

	await page.getByRole('link', { name: 'Edit Walk' }).focus();
	await page.keyboard.press('Alt+ArrowUp');
	await expect(items).toHaveText(['Stretch', 'Walk', 'Water']);

	await saved(page);
	await page.reload();
	await expect(items).toHaveText(['Stretch', 'Walk', 'Water']);
});

test.describe('with reduced motion', () => {
	test.use({ reducedMotion: 'reduce' });

	test('E2E-066 checking still works when animations are turned off', async ({ page }) => {
		await signUp(page);
		await createList(page, 'Calm');
		await addItem(page, 'Milk');

		await page.getByRole('checkbox', { name: 'Milk' }).click();
		await expect(page.getByRole('list', { name: 'Done' }).getByRole('checkbox')).toHaveText([
			'Milk'
		]);
		await expect(page.getByRole('checkbox', { name: 'Milk' })).toHaveCount(1);
	});
});
