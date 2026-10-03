import { z } from 'zod';

/** Input shapes shared by the pages, the REST API and the MCP tools. */

export const id = z.uuid();
export const name = z
	.string()
	.trim()
	.min(1, 'A name is required.')
	.max(200, 'At most 200 characters.');

/** A new list item. `id`, `checked` and `position` are optional so a deleted item can be put back exactly. */
export const newListItem = z.object({
	id: id.optional().describe('Client-chosen id. Generated when omitted.'),
	name: name.describe('The item text.'),
	checked: z.boolean().optional().describe('Whether the item starts checked. Default false.'),
	position: z.number().int().min(0).optional().describe('Sort position. Appended when omitted.')
});

/** Items given either as plain names or as objects. */
export const newListItems = z
	.array(z.union([name, newListItem]))
	.min(1)
	.max(500)
	.transform((items) => items.map((item) => (typeof item === 'string' ? { name: item } : item)));

export const idList = z.array(id).min(1).max(500);

/** A new template item. `id` and `position` are optional so a deleted item can be put back exactly. */
export const newTemplateItem = z.object({
	id: id.optional().describe('Client-chosen id. Generated when omitted.'),
	name: name.describe('The item text.'),
	position: z.number().int().min(0).optional().describe('Sort position. Appended when omitted.')
});

export const newTemplateItems = z
	.array(z.union([name, newTemplateItem]))
	.min(1)
	.max(500)
	.transform((items) => items.map((item) => (typeof item === 'string' ? { name: item } : item)));
