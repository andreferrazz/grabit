import { error, redirect } from '@sveltejs/kit';
import { text } from '#lib/server/forms.ts';
import { createList } from '#lib/server/operations/lists.ts';
import { run } from '#lib/server/operations/registry.ts';
import * as ops from '#lib/server/operations/templates.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import { attempt, requireUserId } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	try {
		return {
			template: await run(ops.getTemplate, locals.user!.id, { templateId: params.id }),
			editingId: url.searchParams.get('edit')
		};
	} catch (cause) {
		if (cause instanceof ServiceError) error(404, 'Template not found');
		throw cause;
	}
};

function newItems(data: FormData): unknown {
	const several = data.get('items');
	if (typeof several === 'string' && several) {
		try {
			return JSON.parse(several);
		} catch {
			return [];
		}
	}
	const id = text(data, 'id');
	return [{ name: text(data, 'name'), ...(id && { id }) }];
}

export const actions: Actions = {
	add: async (event) => {
		const userId = requireUserId(event);
		const data = await event.request.formData();
		return attempt(() =>
			run(ops.addTemplateItems, userId, { templateId: event.params.id, items: newItems(data) })
		);
	},

	renameItem: async (event) => {
		const userId = requireUserId(event);
		const data = await event.request.formData();
		const failure = await attempt(() =>
			run(ops.updateTemplateItem, userId, {
				templateId: event.params.id,
				itemId: text(data, 'id'),
				name: text(data, 'name')
			})
		);
		if (failure) return failure;
		redirect(303, `/templates/${event.params.id}`);
	},

	deleteItem: async (event) => {
		const userId = requireUserId(event);
		const data = await event.request.formData();
		return attempt(() =>
			run(ops.removeTemplateItem, userId, {
				templateId: event.params.id,
				itemId: text(data, 'id')
			})
		);
	},

	restoreItem: async (event) => {
		const userId = requireUserId(event);
		const data = await event.request.formData();
		return attempt(() =>
			run(ops.addTemplateItems, userId, {
				templateId: event.params.id,
				items: [
					{
						id: text(data, 'id'),
						name: text(data, 'name'),
						position: Number(text(data, 'position'))
					}
				]
			})
		);
	},

	rename: async (event) => {
		const userId = requireUserId(event);
		const data = await event.request.formData();
		return attempt(() =>
			run(ops.renameTemplate, userId, { templateId: event.params.id, name: text(data, 'name') })
		);
	},

	delete: async (event) => {
		const userId = requireUserId(event);
		const failure = await attempt(() =>
			run(ops.deleteTemplate, userId, { templateId: event.params.id })
		);
		if (failure) return failure;
		redirect(303, '/templates');
	},

	use: async (event) => {
		const userId = requireUserId(event);

		let listId = '';
		const failure = await attempt(async () => {
			listId = (await run(createList, userId, { templateId: event.params.id })).id;
		});
		if (failure) return failure;

		redirect(303, `/lists/${listId}`);
	}
};
