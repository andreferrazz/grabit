import { z } from 'zod';
import { id, idList, name, newTemplateItems } from '#lib/schemas.ts';
import * as lists from '#lib/server/services/lists.ts';
import * as templates from '#lib/server/services/templates.ts';
import { defineOperation } from './registry.ts';

const templateId = id.describe('The id of the template.');
const itemId = id.describe('The id of the template item.');

export const listTemplates = defineOperation({
	name: 'list_templates',
	description: "List all of the user's templates (reusable checklists), by name, with item counts.",
	input: z.object({}),
	handler: (userId) => templates.listTemplates(userId),
	rest: { method: 'GET', path: '/templates' },
	readOnly: true
});

export const getTemplate = defineOperation({
	name: 'get_template',
	description: 'Get one template with all of its items, in order, including item ids.',
	input: z.object({ templateId }),
	handler: (userId, input) => templates.getTemplate(userId, input.templateId),
	rest: { method: 'GET', path: '/templates/:templateId' },
	readOnly: true
});

export const createTemplate = defineOperation({
	name: 'create_template',
	description:
		'Create a template, optionally with its items. Use create_list with templateId to make a checklist from it.',
	input: z.object({
		id: id.optional().describe('Client-chosen id for the template. Generated when omitted.'),
		name: name.describe('The template name.'),
		items: newTemplateItems.optional().describe('Items to add, as names or objects.')
	}),
	handler: (userId, input) => templates.createTemplate(userId, input),
	rest: { method: 'POST', path: '/templates', status: 201 }
});

export const renameTemplate = defineOperation({
	name: 'rename_template',
	description: 'Rename a template. Returns the updated template.',
	input: z.object({ templateId, name: name.describe('The new name.') }),
	handler: (userId, input) => templates.renameTemplate(userId, input.templateId, input.name),
	rest: { method: 'PATCH', path: '/templates/:templateId' }
});

export const deleteTemplate = defineOperation({
	name: 'delete_template',
	description:
		'Permanently delete a template and its items. Checklists already made from it are kept.',
	input: z.object({ templateId }),
	handler: (userId, input) => templates.deleteTemplate(userId, input.templateId),
	rest: { method: 'DELETE', path: '/templates/:templateId' },
	destructive: true
});

export const addTemplateItems = defineOperation({
	name: 'add_template_items',
	description: 'Add one or more items to the end of a template. Returns the updated template.',
	input: z.object({
		templateId,
		items: newTemplateItems.describe('Items to add, as names or objects.')
	}),
	handler: (userId, input) => templates.addItems(userId, input.templateId, input.items),
	rest: { method: 'POST', path: '/templates/:templateId/items', status: 201 }
});

export const updateTemplateItem = defineOperation({
	name: 'update_template_item',
	description: 'Rename a template item. Returns the updated template.',
	input: z.object({ templateId, itemId, name: name.describe('The new item text.') }),
	handler: (userId, input) =>
		templates.renameItem(userId, input.templateId, input.itemId, input.name),
	rest: { method: 'PATCH', path: '/templates/:templateId/items/:itemId' }
});

export const removeTemplateItem = defineOperation({
	name: 'remove_template_item',
	description: 'Delete one item from a template. Returns the updated template.',
	input: z.object({ templateId, itemId }),
	handler: (userId, input) => templates.removeItems(userId, input.templateId, [input.itemId]),
	rest: { method: 'DELETE', path: '/templates/:templateId/items/:itemId' },
	destructive: true,
	// MCP clients use the plural tool, which removes one or many.
	mcp: false
});

export const removeTemplateItems = defineOperation({
	name: 'remove_template_items',
	description: 'Delete several items from a template in one call. Returns the updated template.',
	input: z.object({ templateId, itemIds: idList.describe('The ids of the items to delete.') }),
	handler: (userId, input) => templates.removeItems(userId, input.templateId, input.itemIds),
	rest: { method: 'POST', path: '/templates/:templateId/items/remove' },
	destructive: true
});

export const reorderTemplateItems = defineOperation({
	name: 'reorder_template_items',
	description:
		"Set the order of a template's items. Give every item id exactly once, in the wanted order. Returns the updated template.",
	input: z.object({
		templateId,
		itemIds: idList.describe('Every item id of the template, in order.')
	}),
	handler: (userId, input) => templates.reorderItems(userId, input.templateId, input.itemIds),
	rest: { method: 'PUT', path: '/templates/:templateId/items/order' }
});

export const saveListAsTemplate = defineOperation({
	name: 'save_list_as_template',
	description:
		"Create a new template from a checklist's items (their checked state is not copied). Returns the new template's id, name and item count.",
	input: z.object({
		listId: id.describe('The id of the list to copy.'),
		name: name.optional().describe("The template name. Defaults to the list's name.")
	}),
	handler: (userId, input) => lists.saveListAsTemplate(userId, input.listId, input.name),
	rest: { method: 'POST', path: '/lists/:listId/save-as-template', status: 201 }
});

export const templateOperations = [
	listTemplates,
	getTemplate,
	createTemplate,
	renameTemplate,
	deleteTemplate,
	addTemplateItems,
	updateTemplateItem,
	removeTemplateItem,
	removeTemplateItems,
	reorderTemplateItems,
	saveListAsTemplate
];
