import { z } from 'zod';
import { id, idList, name, newListItems } from '#lib/schemas.ts';
import * as lists from '#lib/server/services/lists.ts';
import { defineOperation } from './registry.ts';

const listId = id.describe('The id of the list.');
const itemId = id.describe('The id of the item.');

export const listLists = defineOperation({
	name: 'list_lists',
	description: "List all of the user's checklists, newest first, with item and checked counts.",
	input: z.object({}),
	handler: (userId) => lists.listLists(userId),
	rest: { method: 'GET', path: '/lists' },
	readOnly: true
});

export const getList = defineOperation({
	name: 'get_list',
	description: 'Get one checklist with all of its items, in order, including item ids.',
	input: z.object({ listId }),
	handler: (userId, input) => lists.getList(userId, input.listId),
	rest: { method: 'GET', path: '/lists/:listId' },
	readOnly: true
});

export const createList = defineOperation({
	name: 'create_list',
	description:
		"Create a checklist. Give a name, or a templateId to copy a template's items (the name then defaults to the template's). Extra items are added after the copied ones. Returns the new list.",
	input: z
		.object({
			id: id.optional().describe('Client-chosen id for the list. Generated when omitted.'),
			name: name.optional().describe('The list name. Required unless templateId is given.'),
			templateId: id.optional().describe('Copy the items of this template into the new list.'),
			items: newListItems.optional().describe('Items to add, as names or objects.')
		})
		.refine((input) => input.name !== undefined || input.templateId !== undefined, {
			message: 'Give a name or a templateId.'
		}),
	handler: (userId, input) => lists.createList(userId, input),
	rest: { method: 'POST', path: '/lists', status: 201 }
});

export const renameList = defineOperation({
	name: 'rename_list',
	description: 'Rename a checklist. Returns the updated list.',
	input: z.object({ listId, name: name.describe('The new name.') }),
	handler: (userId, input) => lists.renameList(userId, input.listId, input.name),
	rest: { method: 'PATCH', path: '/lists/:listId' }
});

export const deleteList = defineOperation({
	name: 'delete_list',
	description: 'Permanently delete a checklist and all of its items.',
	input: z.object({ listId }),
	handler: (userId, input) => lists.deleteList(userId, input.listId),
	rest: { method: 'DELETE', path: '/lists/:listId' },
	destructive: true
});

export const addItems = defineOperation({
	name: 'add_items',
	description: 'Add one or more items to the end of a checklist. Returns the updated list.',
	input: z.object({ listId, items: newListItems.describe('Items to add, as names or objects.') }),
	handler: (userId, input) => lists.addItems(userId, input.listId, input.items),
	rest: { method: 'POST', path: '/lists/:listId/items', status: 201 }
});

export const updateItem = defineOperation({
	name: 'update_item',
	description: 'Rename an item, check it, or uncheck it. Returns the updated list.',
	input: z
		.object({
			listId,
			itemId,
			name: name.optional().describe('The new item text.'),
			checked: z.boolean().optional().describe('true to check the item, false to uncheck it.')
		})
		.refine((input) => input.name !== undefined || input.checked !== undefined, {
			message: 'Give a name, a checked value, or both.'
		}),
	handler: (userId, input) =>
		lists.updateItem(userId, input.listId, input.itemId, {
			name: input.name,
			checked: input.checked
		}),
	rest: { method: 'PATCH', path: '/lists/:listId/items/:itemId' }
});

export const setItemsChecked = defineOperation({
	name: 'set_items_checked',
	description:
		'Check or uncheck several items of a checklist in one call. Returns the updated list.',
	input: z.object({
		listId,
		itemIds: idList.describe('The ids of the items to change.'),
		checked: z.boolean().describe('true to check the items, false to uncheck them.')
	}),
	handler: (userId, input) =>
		lists.setItemsChecked(userId, input.listId, input.itemIds, input.checked),
	rest: { method: 'POST', path: '/lists/:listId/items/check' }
});

export const removeItem = defineOperation({
	name: 'remove_item',
	description: 'Delete one item from a checklist. Returns the updated list.',
	input: z.object({ listId, itemId }),
	handler: (userId, input) => lists.removeItems(userId, input.listId, [input.itemId]),
	rest: { method: 'DELETE', path: '/lists/:listId/items/:itemId' },
	destructive: true,
	// MCP clients use the plural tool, which removes one or many.
	mcp: false
});

export const removeItems = defineOperation({
	name: 'remove_items',
	description: 'Delete several items from a checklist in one call. Returns the updated list.',
	input: z.object({ listId, itemIds: idList.describe('The ids of the items to delete.') }),
	handler: (userId, input) => lists.removeItems(userId, input.listId, input.itemIds),
	rest: { method: 'POST', path: '/lists/:listId/items/remove' },
	destructive: true
});

export const reorderItems = defineOperation({
	name: 'reorder_items',
	description:
		"Set the order of a checklist's items. Give every item id exactly once, in the wanted order. Returns the updated list.",
	input: z.object({ listId, itemIds: idList.describe('Every item id of the list, in order.') }),
	handler: (userId, input) => lists.reorderItems(userId, input.listId, input.itemIds),
	rest: { method: 'PUT', path: '/lists/:listId/items/order' }
});

export const uncheckAll = defineOperation({
	name: 'uncheck_all',
	description:
		'Uncheck every item of a checklist so it can be used again. Returns the updated list.',
	input: z.object({ listId }),
	handler: (userId, input) => lists.uncheckAll(userId, input.listId),
	rest: { method: 'POST', path: '/lists/:listId/uncheck-all' }
});

export const clearChecked = defineOperation({
	name: 'clear_checked',
	description: 'Delete every checked item of a checklist. Returns the updated list.',
	input: z.object({ listId }),
	handler: (userId, input) => lists.clearChecked(userId, input.listId),
	rest: { method: 'POST', path: '/lists/:listId/clear-checked' },
	destructive: true
});

export const listOperations = [
	listLists,
	getList,
	createList,
	renameList,
	deleteList,
	addItems,
	updateItem,
	setItemsChecked,
	removeItem,
	removeItems,
	reorderItems,
	uncheckAll,
	clearChecked
];
