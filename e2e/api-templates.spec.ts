import { expect, otherVisitor, signUp, test } from './fixtures.ts';

const api = '/api/v1';
const names = (items: { name: string }[]) => items.map((item) => item.name);

test('E2E-037 the API creates, edits, reorders and deletes templates and their items', async ({
	page
}) => {
	await signUp(page);
	const request = page.request;

	const created = await request.post(`${api}/templates`, {
		data: { name: 'Packing', items: ['Passport', 'Charger'] }
	});
	expect(created.status()).toBe(201);
	const template = await created.json();
	expect(template).toMatchObject({ name: 'Packing', itemCount: 2 });
	const items = `${api}/templates/${template.id}/items`;

	const added = await (await request.post(items, { data: { items: ['Socks'] } })).json();
	expect(names(added.items)).toEqual(['Passport', 'Charger', 'Socks']);
	const [passport, charger, socks] = added.items;

	const renamed = await (
		await request.patch(`${items}/${charger.id}`, { data: { name: 'USB-C charger' } })
	).json();
	expect(names(renamed.items)).toEqual(['Passport', 'USB-C charger', 'Socks']);

	const reordered = await (
		await request.put(`${items}/order`, { data: { itemIds: [socks.id, passport.id, charger.id] } })
	).json();
	expect(names(reordered.items)).toEqual(['Socks', 'Passport', 'USB-C charger']);

	const removed = await (await request.delete(`${items}/${socks.id}`)).json();
	expect(names(removed.items)).toEqual(['Passport', 'USB-C charger']);

	const retitled = await (
		await request.patch(`${api}/templates/${template.id}`, { data: { name: 'Travel' } })
	).json();
	expect(retitled.name).toBe('Travel');

	const all = await (await request.get(`${api}/templates`)).json();
	expect(all).toEqual([expect.objectContaining({ id: template.id, name: 'Travel', itemCount: 2 })]);

	expect(await (await request.delete(`${api}/templates/${template.id}`)).json()).toEqual({
		deleted: true
	});
	expect((await request.get(`${api}/templates/${template.id}`)).status()).toBe(404);
});

test('E2E-038 a list made from a template is an independent copy', async ({ page }) => {
	await signUp(page);
	const request = page.request;
	const template = await (
		await request.post(`${api}/templates`, { data: { name: 'Groceries', items: ['Milk', 'Eggs'] } })
	).json();

	const created = await request.post(`${api}/lists`, {
		data: { templateId: template.id, items: ['Bread'] }
	});
	expect(created.status()).toBe(201);
	const list = await created.json();
	expect(list).toMatchObject({ name: 'Groceries', templateId: template.id, checkedCount: 0 });
	expect(names(list.items)).toEqual(['Milk', 'Eggs', 'Bread']);

	const named = await (
		await request.post(`${api}/lists`, { data: { templateId: template.id, name: 'This week' } })
	).json();
	expect(named.name).toBe('This week');

	// Changing the template afterwards leaves the list as it was.
	await request.post(`${api}/templates/${template.id}/items`, { data: { items: ['Butter'] } });
	expect(names((await (await request.get(`${api}/lists/${list.id}`)).json()).items)).toEqual([
		'Milk',
		'Eggs',
		'Bread'
	]);

	// Deleting the template keeps the list and clears its link.
	await request.delete(`${api}/templates/${template.id}`);
	const kept = await (await request.get(`${api}/lists/${list.id}`)).json();
	expect(kept.templateId).toBeNull();
	expect(kept.items).toHaveLength(3);
});

test('E2E-039 the API saves a list as a template without its checked state', async ({ page }) => {
	await signUp(page);
	const request = page.request;
	const list = await (
		await request.post(`${api}/lists`, {
			data: { name: 'Camping', items: [{ name: 'Tent', checked: true }, 'Stove'] }
		})
	).json();

	const saved = await request.post(`${api}/lists/${list.id}/save-as-template`, { data: {} });
	expect(saved.status()).toBe(201);
	const summary = await saved.json();
	expect(summary).toMatchObject({ name: 'Camping', itemCount: 2 });

	const template = await (await request.get(`${api}/templates/${summary.id}`)).json();
	expect(names(template.items)).toEqual(['Tent', 'Stove']);

	const fresh = await (
		await request.post(`${api}/lists`, { data: { templateId: summary.id } })
	).json();
	expect(fresh.checkedCount).toBe(0);
});

test("E2E-040 one user cannot see, change or use another user's template", async ({
	page,
	browser,
	baseURL
}) => {
	await signUp(page);
	const template = await (
		await page.request.post(`${api}/templates`, { data: { name: 'Private', items: ['Secret'] } })
	).json();

	const stranger = await otherVisitor(browser, baseURL);
	await signUp(stranger);
	const request = stranger.request;

	expect((await request.get(`${api}/templates/${template.id}`)).status()).toBe(404);
	expect(
		(await request.patch(`${api}/templates/${template.id}`, { data: { name: 'Mine' } })).status()
	).toBe(404);
	expect((await request.delete(`${api}/templates/${template.id}`)).status()).toBe(404);
	expect((await request.post(`${api}/lists`, { data: { templateId: template.id } })).status()).toBe(
		404
	);
	expect(await (await request.get(`${api}/templates`)).json()).toEqual([]);
	await stranger.context().close();
});
