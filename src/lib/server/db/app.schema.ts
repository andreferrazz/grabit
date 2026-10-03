import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema.ts';

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
};

export const templates = pgTable(
	'templates',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		...timestamps
	},
	(table) => [
		index('templates_user_name_idx').on(table.userId, table.name),
		check('templates_name_length', sql`char_length(${table.name}) between 1 and 200`)
	]
);

export const templateItems = pgTable(
	'template_items',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		templateId: uuid('template_id')
			.notNull()
			.references(() => templates.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		position: integer('position').notNull(),
		...timestamps
	},
	(table) => [
		index('template_items_template_position_idx').on(table.templateId, table.position),
		check('template_items_name_length', sql`char_length(${table.name}) between 1 and 200`)
	]
);

export const lists = pgTable(
	'lists',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		// Where the list came from. Items are copied at creation, so this is provenance only.
		templateId: uuid('template_id').references(() => templates.id, { onDelete: 'set null' }),
		...timestamps
	},
	(table) => [
		index('lists_user_created_idx').on(table.userId, table.createdAt.desc()),
		check('lists_name_length', sql`char_length(${table.name}) between 1 and 200`)
	]
);

export const listItems = pgTable(
	'list_items',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		listId: uuid('list_id')
			.notNull()
			.references(() => lists.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		checked: boolean('checked').notNull().default(false),
		checkedAt: timestamp('checked_at', { withTimezone: true }),
		// Not unique: items are ordered by (position, id), and a reorder renumbers them.
		position: integer('position').notNull(),
		...timestamps
	},
	(table) => [
		index('list_items_list_position_idx').on(table.listId, table.position),
		check('list_items_name_length', sql`char_length(${table.name}) between 1 and 200`)
	]
);
