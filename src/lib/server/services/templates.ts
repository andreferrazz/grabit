import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { templateItems, templates } from '#lib/server/db/schema.ts';
import { isUniqueViolation, ServiceError } from './errors.ts';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TemplateItem = { id: string; name: string; position: number };

export type TemplateSummary = {
	id: string;
	name: string;
	itemCount: number;
	createdAt: Date;
	updatedAt: Date;
};

export type TemplateDetail = TemplateSummary & { items: TemplateItem[] };

export type NewTemplateItem = { id?: string; name: string; position?: number };

async function requireTemplate(tx: Tx, userId: string, templateId: string, lock = false) {
	const query = tx
		.select()
		.from(templates)
		.where(and(eq(templates.id, templateId), eq(templates.userId, userId)));
	const [row] = lock ? await query.for('update') : await query;
	if (!row) throw new ServiceError('NOT_FOUND', 'Template not found.');
	return row;
}

async function readTemplate(tx: Tx, userId: string, templateId: string): Promise<TemplateDetail> {
	const template = await requireTemplate(tx, userId, templateId);
	const items = await tx
		.select({ id: templateItems.id, name: templateItems.name, position: templateItems.position })
		.from(templateItems)
		.where(eq(templateItems.templateId, templateId))
		.orderBy(asc(templateItems.position), asc(templateItems.id));

	return {
		id: template.id,
		name: template.name,
		itemCount: items.length,
		createdAt: template.createdAt,
		updatedAt: template.updatedAt,
		items
	};
}

async function touch(tx: Tx, templateId: string) {
	await tx.update(templates).set({ updatedAt: new Date() }).where(eq(templates.id, templateId));
}

async function insertItems(tx: Tx, templateId: string, items: NewTemplateItem[]) {
	const [{ next }] = await tx
		.select({ next: sql<number>`coalesce(max(${templateItems.position}) + 1, 0)::int` })
		.from(templateItems)
		.where(eq(templateItems.templateId, templateId));

	let appended = 0;
	await tx.insert(templateItems).values(
		items.map((item) => ({
			id: item.id,
			templateId,
			name: item.name,
			position: item.position ?? next + appended++
		}))
	);
}

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

export async function listTemplates(userId: string): Promise<TemplateSummary[]> {
	return db
		.select({
			id: templates.id,
			name: templates.name,
			itemCount: sql<number>`count(${templateItems.id})::int`,
			createdAt: templates.createdAt,
			updatedAt: templates.updatedAt
		})
		.from(templates)
		.leftJoin(templateItems, eq(templateItems.templateId, templates.id))
		.where(eq(templates.userId, userId))
		.groupBy(templates.id)
		.orderBy(asc(templates.name), asc(templates.id));
}

export async function getTemplate(userId: string, templateId: string): Promise<TemplateDetail> {
	return db.transaction((tx) => readTemplate(tx, userId, templateId));
}

export async function createTemplate(
	userId: string,
	input: { id?: string; name: string; items?: NewTemplateItem[] }
): Promise<TemplateDetail> {
	return withConflict('A template or item', () =>
		db.transaction(async (tx) => {
			const [template] = await tx
				.insert(templates)
				.values({ id: input.id, userId, name: input.name })
				.returning({ id: templates.id });
			if (input.items?.length) await insertItems(tx, template.id, input.items);
			return readTemplate(tx, userId, template.id);
		})
	);
}

export async function renameTemplate(
	userId: string,
	templateId: string,
	name: string
): Promise<TemplateDetail> {
	return db.transaction(async (tx) => {
		await requireTemplate(tx, userId, templateId, true);
		await tx
			.update(templates)
			.set({ name, updatedAt: new Date() })
			.where(eq(templates.id, templateId));
		return readTemplate(tx, userId, templateId);
	});
}

/** Lists made from the template keep their items; only their link to it is cleared. */
export async function deleteTemplate(
	userId: string,
	templateId: string
): Promise<{ deleted: true }> {
	return db.transaction(async (tx) => {
		await requireTemplate(tx, userId, templateId, true);
		await tx.delete(templates).where(eq(templates.id, templateId));
		return { deleted: true as const };
	});
}

export async function addItems(
	userId: string,
	templateId: string,
	items: NewTemplateItem[]
): Promise<TemplateDetail> {
	return withConflict('An item', () =>
		db.transaction(async (tx) => {
			await requireTemplate(tx, userId, templateId, true);
			await insertItems(tx, templateId, items);
			await touch(tx, templateId);
			return readTemplate(tx, userId, templateId);
		})
	);
}

export async function renameItem(
	userId: string,
	templateId: string,
	itemId: string,
	name: string
): Promise<TemplateDetail> {
	return db.transaction(async (tx) => {
		await requireTemplate(tx, userId, templateId, true);
		const updated = await tx
			.update(templateItems)
			.set({ name, updatedAt: new Date() })
			.where(and(eq(templateItems.id, itemId), eq(templateItems.templateId, templateId)))
			.returning({ id: templateItems.id });
		if (updated.length === 0) throw new ServiceError('NOT_FOUND', 'Item not found.');
		await touch(tx, templateId);
		return readTemplate(tx, userId, templateId);
	});
}

export async function removeItems(
	userId: string,
	templateId: string,
	itemIds: string[]
): Promise<TemplateDetail> {
	return db.transaction(async (tx) => {
		await requireTemplate(tx, userId, templateId, true);
		const removed = await tx
			.delete(templateItems)
			.where(and(eq(templateItems.templateId, templateId), inArray(templateItems.id, itemIds)))
			.returning({ id: templateItems.id });
		if (removed.length === 0) throw new ServiceError('NOT_FOUND', 'Item not found.');
		await touch(tx, templateId);
		return readTemplate(tx, userId, templateId);
	});
}

/** Sets the order of every item in the template. `itemIds` must name each item exactly once. */
export async function reorderItems(
	userId: string,
	templateId: string,
	itemIds: string[]
): Promise<TemplateDetail> {
	return db.transaction(async (tx) => {
		await requireTemplate(tx, userId, templateId, true);
		const current = await tx
			.select({ id: templateItems.id })
			.from(templateItems)
			.where(eq(templateItems.templateId, templateId));

		const wanted = new Set(itemIds);
		const complete =
			wanted.size === itemIds.length &&
			wanted.size === current.length &&
			current.every(({ id }) => wanted.has(id));
		if (!complete) {
			throw new ServiceError(
				'VALIDATION',
				'The order must name every item in the template exactly once.'
			);
		}

		for (const [position, id] of itemIds.entries()) {
			await tx.update(templateItems).set({ position }).where(eq(templateItems.id, id));
		}
		await touch(tx, templateId);
		return readTemplate(tx, userId, templateId);
	});
}
