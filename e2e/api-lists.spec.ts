import { randomUUID } from 'node:crypto';
import { expect, otherVisitor, signUp, test } from './fixtures.ts';

const api = '/api/v1';

test('E2E-014 the API refuses callers who are not signed in', async ({ request }) => {
	const response = await request.get(`${api}/lists`);

	expect(response.status()).toBe(401);
	expect(response.headers()['www-authenticate']).toBe('Bearer');
	expect((await response.json()).error.code).toBe('UNAUTHENTICATED');
});

test('E2E-015 the API creates a list with items and reads it back with counts', async ({
	page
}) => {
	await signUp(page);
	const request = page.request;

	const created = await request.post(`${api}/lists`, {
		data: { name: 'Groceries', items: ['Milk', { name: 'Eggs', checked: true }] }
	});
	expect(created.status()).toBe(201);
	const list = await created.json();
	expect(list).toMatchObject({ name: 'Groceries', itemCount: 2, checkedCount: 1 });
	expect(list.items.map((item: { name: string }) => item.name)).toEqual(['Milk', 'Eggs']);

	const fetched = await (await request.get(`${api}/lists/${list.id}`)).json();
	expect(fetched.items).toHaveLength(2);

	const all = await (await request.get(`${api}/lists`)).json();
	expect(all).toHaveLength(1);
	expect(all[0]).toMatchObject({ id: list.id, itemCount: 2, checkedCount: 1 });
	expect(all[0].items).toBeUndefined();
});

test('E2E-016 the API renames and deletes a list', async ({ page }) => {
	await signUp(page);
	const request = page.request;
	const list = await (await request.post(`${api}/lists`, { data: { name: 'Old name' } })).json();

	const renamed = await request.patch(`${api}/lists/${list.id}`, { data: { name: 'New name' } });
	expect((await renamed.json()).name).toBe('New name');

	const deleted = await request.delete(`${api}/lists/${list.id}`);
	expect(await deleted.json()).toEqual({ deleted: true });
	expect((await request.get(`${api}/lists/${list.id}`)).status()).toBe(404);
});

test('E2E-078 the API sets and clears the default list', async ({ page }) => {
	await signUp(page);
	const request = page.request;
	const first = await (await request.post(`${api}/lists`, { data: { name: 'First' } })).json();
	const second = await (await request.post(`${api}/lists`, { data: { name: 'Second' } })).json();
	expect(first.isDefault).toBe(false);

	const set = await request.put(`${api}/lists/${first.id}/default`, { data: { isDefault: true } });
	expect((await set.json()).isDefault).toBe(true);
	await request.put(`${api}/lists/${second.id}/default`, { data: { isDefault: true } });

	const defaults = async () =>
		((await (await request.get(`${api}/lists`)).json()) as { id: string; isDefault: boolean }[])
			.filter((list) => list.isDefault)
			.map((list) => list.id);
	expect(await defaults()).toEqual([second.id]);

	await request.put(`${api}/lists/${second.id}/default`, { data: { isDefault: false } });
	expect(await defaults()).toEqual([]);
});

test('E2E-017 the API adds, renames, checks and removes items', async ({ page }) => {
	await signUp(page);
	const request = page.request;
	const list = await (await request.post(`${api}/lists`, { data: { name: 'Trip' } })).json();
	const items = `${api}/lists/${list.id}/items`;

	const added = await request.post(items, { data: { items: ['Passport', 'Charger', 'Socks'] } });
	expect(added.status()).toBe(201);
	const [passport, charger, socks] = (await added.json()).items;

	const renamed = await request.patch(`${items}/${charger.id}`, {
		data: { name: 'USB-C charger' }
	});
	expect((await renamed.json()).items[1].name).toBe('USB-C charger');

	const checked = await (
		await request.patch(`${items}/${passport.id}`, { data: { checked: true } })
	).json();
	expect(checked.items[0].checked).toBe(true);
	expect(checked.items[0].checkedAt).not.toBeNull();
	expect(checked.checkedCount).toBe(1);

	const bulk = await (
		await request.post(`${items}/check`, {
			data: { itemIds: [charger.id, socks.id], checked: true }
		})
	).json();
	expect(bulk.checkedCount).toBe(3);

	const unchecked = await (
		await request.post(`${api}/lists/${list.id}/uncheck-all`, { data: {} })
	).json();
	expect(unchecked.checkedCount).toBe(0);

	const removed = await (await request.delete(`${items}/${socks.id}`)).json();
	expect(removed.items.map((item: { name: string }) => item.name)).toEqual([
		'Passport',
		'USB-C charger'
	]);
	expect((await request.delete(`${items}/${socks.id}`)).status()).toBe(404);

	await request.patch(`${items}/${passport.id}`, { data: { checked: true } });
	const cleared = await (
		await request.post(`${api}/lists/${list.id}/clear-checked`, { data: {} })
	).json();
	expect(cleared.items.map((item: { name: string }) => item.name)).toEqual(['USB-C charger']);
});

test('E2E-018 the API reorders items and refuses an incomplete order', async ({ page }) => {
	await signUp(page);
	const request = page.request;
	const list = await (
		await request.post(`${api}/lists`, { data: { name: 'Steps', items: ['One', 'Two', 'Three'] } })
	).json();
	const ids = list.items.map((item: { id: string }) => item.id);
	const order = `${api}/lists/${list.id}/items/order`;

	const reordered = await (
		await request.put(order, { data: { itemIds: [ids[2], ids[0], ids[1]] } })
	).json();
	expect(reordered.items.map((item: { name: string }) => item.name)).toEqual([
		'Three',
		'One',
		'Two'
	]);

	const incomplete = await request.put(order, { data: { itemIds: [ids[0], ids[1]] } });
	expect(incomplete.status()).toBe(400);
	expect((await incomplete.json()).error.code).toBe('VALIDATION');
});

test('E2E-019 the API rejects bad input with clear errors', async ({ page }) => {
	await signUp(page);
	const request = page.request;

	const emptyName = await request.post(`${api}/lists`, { data: { name: '   ' } });
	expect(emptyName.status()).toBe(400);
	expect((await emptyName.json()).error).toMatchObject({ code: 'VALIDATION' });

	const notJson = await request.post(`${api}/lists`, { form: { name: 'From a form' } });
	expect(notJson.status()).toBe(415);

	const badId = await request.get(`${api}/lists/not-a-uuid`);
	expect(badId.status()).toBe(400);

	const unknownPath = await request.get(`${api}/nothing-here`);
	expect(unknownPath.status()).toBe(404);

	const wrongMethod = await request.put(`${api}/lists`, { data: {} });
	expect(wrongMethod.status()).toBe(405);
	expect(wrongMethod.headers()['allow']).toContain('GET');
});

test("E2E-020 one user cannot see or change another user's list", async ({
	page,
	browser,
	baseURL
}) => {
	await signUp(page);
	const list = await (
		await page.request.post(`${api}/lists`, { data: { name: 'Private', items: ['Secret'] } })
	).json();

	const stranger = await otherVisitor(browser, baseURL);
	await signUp(stranger);

	expect((await stranger.request.get(`${api}/lists/${list.id}`)).status()).toBe(404);
	expect(
		(
			await stranger.request.patch(`${api}/lists/${list.id}`, { data: { name: 'Mine now' } })
		).status()
	).toBe(404);
	expect(
		(
			await stranger.request.patch(`${api}/lists/${list.id}/items/${list.items[0].id}`, {
				data: { checked: true }
			})
		).status()
	).toBe(404);
	expect((await stranger.request.delete(`${api}/lists/${list.id}`)).status()).toBe(404);
	expect(await (await stranger.request.get(`${api}/lists`)).json()).toEqual([]);

	expect((await (await page.request.get(`${api}/lists/${list.id}`)).json()).name).toBe('Private');
	await stranger.context().close();
});

test('E2E-021 a client-chosen id is honoured and a duplicate is a conflict', async ({ page }) => {
	await signUp(page);
	const request = page.request;
	const id = randomUUID();

	const created = await request.post(`${api}/lists`, { data: { id, name: 'Chosen id' } });
	expect((await created.json()).id).toBe(id);

	const duplicate = await request.post(`${api}/lists`, { data: { id, name: 'Again' } });
	expect(duplicate.status()).toBe(409);
	expect((await duplicate.json()).error.code).toBe('CONFLICT');
});
