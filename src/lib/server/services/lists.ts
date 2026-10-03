import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { listItems, lists } from '#lib/server/db/schema.ts';
import { isUniqueViolation, ServiceError } from './errors.ts';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ListItem = {
	id: string;
	name: string;
	checked: boolean;
	checkedAt: Date | null;
	position: number;
};

export type ListSummary = {
	id: string;
	name: string;
	templateId: string | null;
	itemCount: number;
	checkedCount: number;
	createdAt: Date;
	updatedAt: Date;
};

export type ListDetail = ListSummary & { items: ListItem[] };

export type NewItem = { id?: string; name: string; checked?: boolean; position?: number };

/** Loads a list the user owns, or fails as not-found: another user's list is indistinguishable from a missing one. */
async function requireList(tx: Tx, userId: string, listId: string, lock = false) {
	const query = tx
		.select()
		.from(lists)
		.where(and(eq(lists.id, listId), eq(lists.userId, userId)));
	const [row] = lock ? await query.for('update') : await query;
	if (!row) throw new ServiceError('NOT_FOUND', 'List not found.');
	return row;
}

async function readList(tx: Tx, userId: string, listId: string): Promise<ListDetail> {
	const list = await requireList(tx, userId, listId);
	const items = await tx
		.select({
			id: listItems.id,
			name: listItems.name,
			checked: listItems.checked,
			checkedAt: listItems.checkedAt,
			position: listItems.position
		})
		.from(listItems)
		.where(eq(listItems.listId, listId))
		.orderBy(asc(listItems.position), asc(listItems.id));

	return {
		id: list.id,
		name: list.name,
		templateId: list.templateId,
		itemCount: items.length,
		checkedCount: items.filter((item) => item.checked).length,
		createdAt: list.createdAt,
		updatedAt: list.updatedAt,
		items
	};
}

async function touch(tx: Tx, listId: string) {
	await tx.update(lists).set({ updatedAt: new Date() }).where(eq(lists.id, listId));
}

async function insertItems(tx: Tx, listId: string, items: NewItem[]) {
	const [{ next }] = await tx
		.select({ next: sql<number>`coalesce(max(${listItems.position}) + 1, 0)::int` })
		.from(listItems)
		.where(eq(listItems.listId, listId));

	let appended = 0;
	await tx.insert(listItems).values(
		items.map((item) => ({
			id: item.id,
			listId,
			name: item.name,
			checked: item.checked ?? false,
			checkedAt: item.checked ? new Date() : null,
			position: item.position ?? next + appended++
		}))
	);
}

/** Turns a duplicate client-chosen id into a CONFLICT instead of a 500. */
async function withConflict<T>(what: string, run: () => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw new ServiceError('CONFLICT', `${what} with that id already exists.`);
		}
		throw error;
	}
}

export async function listLists(userId: string): Promise<ListSummary[]> {
	return db
		.select({
			id: lists.id,
			name: lists.name,
			templateId: lists.templateId,
			itemCount: sql<number>`count(${listItems.id})::int`,
			checkedCount: sql<number>`(count(${listItems.id}) filter (where ${listItems.checked}))::int`,
			createdAt: lists.createdAt,
			updatedAt: lists.updatedAt
		})
		.from(lists)
		.leftJoin(listItems, eq(listItems.listId, lists.id))
		.where(eq(lists.userId, userId))
		.groupBy(lists.id)
		.orderBy(desc(lists.createdAt), asc(lists.id));
}

export async function getList(userId: string, listId: string): Promise<ListDetail> {
	return db.transaction((tx) => readList(tx, userId, listId));
}

export async function createList(
	userId: string,
	input: { id?: string; name: string; items?: NewItem[] }
): Promise<ListDetail> {
	return withConflict('A list or item', () =>
		db.transaction(async (tx) => {
			const [list] = await tx
				.insert(lists)
				.values({ id: input.id, userId, name: input.name })
				.returning({ id: lists.id });
			if (input.items?.length) await insertItems(tx, list.id, input.items);
			return readList(tx, userId, list.id);
		})
	);
}

export async function renameList(
	userId: string,
	listId: string,
	name: string
): Promise<ListDetail> {
	return db.transaction(async (tx) => {
		await requireList(tx, userId, listId, true);
		await tx.update(lists).set({ name, updatedAt: new Date() }).where(eq(lists.id, listId));
		return readList(tx, userId, listId);
	});
}

export async function deleteList(userId: string, listId: string): Promise<{ deleted: true }> {
	return db.transaction(async (tx) => {
		await requireList(tx, userId, listId, true);
		await tx.delete(lists).where(eq(lists.id, listId));
		return { deleted: true as const };
	});
}

export async function addItems(
	userId: string,
	listId: string,
	items: NewItem[]
): Promise<ListDetail> {
	return withConflict('An item', () =>
		db.transaction(async (tx) => {
			// The row lock makes concurrent appends take turns, so positions do not collide.
			await requireList(tx, userId, listId, true);
			await insertItems(tx, listId, items);
			await touch(tx, listId);
			return readList(tx, userId, listId);
		})
	);
}

export async function updateItem(
	userId: string,
	listId: string,
	itemId: string,
	changes: { name?: string; checked?: boolean }
): Promise<ListDetail> {
	return db.transaction(async (tx) => {
		await requireList(tx, userId, listId, true);
		const updated = await tx
			.update(listItems)
			.set({
				...(changes.name !== undefined && { name: changes.name }),
				...(changes.checked !== undefined && {
					checked: changes.checked,
					checkedAt: changes.checked ? new Date() : null
				}),
				updatedAt: new Date()
			})
			.where(and(eq(listItems.id, itemId), eq(listItems.listId, listId)))
			.returning({ id: listItems.id });
		if (updated.length === 0) throw new ServiceError('NOT_FOUND', 'Item not found.');
		await touch(tx, listId);
		return readList(tx, userId, listId);
	});
}

export async function setItemsChecked(
	userId: string,
	listId: string,
	itemIds: string[],
	checked: boolean
): Promise<ListDetail> {
	return db.transaction(async (tx) => {
		await requireList(tx, userId, listId, true);
		await tx
			.update(listItems)
			.set({ checked, checkedAt: checked ? new Date() : null, updatedAt: new Date() })
			.where(and(eq(listItems.listId, listId), inArray(listItems.id, itemIds)));
		await touch(tx, listId);
		return readList(tx, userId, listId);
	});
}

export async function removeItems(
	userId: string,
	listId: string,
	itemIds: string[]
): Promise<ListDetail> {
	return db.transaction(async (tx) => {
		await requireList(tx, userId, listId, true);
		const removed = await tx
			.delete(listItems)
			.where(and(eq(listItems.listId, listId), inArray(listItems.id, itemIds)))
			.returning({ id: listItems.id });
		if (removed.length === 0) throw new ServiceError('NOT_FOUND', 'Item not found.');
		await touch(tx, listId);
		return readList(tx, userId, listId);
	});
}

/** Sets the order of every item in the list. `itemIds` must name each item exactly once. */
export async function reorderItems(
	userId: string,
	listId: string,
	itemIds: string[]
): Promise<ListDetail> {
	return db.transaction(async (tx) => {
		await requireList(tx, userId, listId, true);
		const current = await tx
			.select({ id: listItems.id })
			.from(listItems)
			.where(eq(listItems.listId, listId));

		const wanted = new Set(itemIds);
		if (wanted.size !== itemIds.length || wanted.size !== current.length) {
			throw new ServiceError(
				'VALIDATION',
				'The order must name every item in the list exactly once.'
			);
		}
		for (const { id } of current) {
			if (!wanted.has(id)) {
				throw new ServiceError(
					'VALIDATION',
					'The order must name every item in the list exactly once.'
				);
			}
		}

		for (const [position, id] of itemIds.entries()) {
			await tx.update(listItems).set({ position }).where(eq(listItems.id, id));
		}
		await touch(tx, listId);
		return readList(tx, userId, listId);
	});
}

export async function uncheckAll(userId: string, listId: string): Promise<ListDetail> {
	return db.transaction(async (tx) => {
		await requireList(tx, userId, listId, true);
		await tx
			.update(listItems)
			.set({ checked: false, checkedAt: null, updatedAt: new Date() })
			.where(and(eq(listItems.listId, listId), eq(listItems.checked, true)));
		await touch(tx, listId);
		return readList(tx, userId, listId);
	});
}

export async function clearChecked(userId: string, listId: string): Promise<ListDetail> {
	return db.transaction(async (tx) => {
		await requireList(tx, userId, listId, true);
		await tx
			.delete(listItems)
			.where(and(eq(listItems.listId, listId), eq(listItems.checked, true)));
		await touch(tx, listId);
		return readList(tx, userId, listId);
	});
}
