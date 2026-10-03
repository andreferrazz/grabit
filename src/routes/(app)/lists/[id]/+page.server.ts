import { error, redirect } from '@sveltejs/kit';
import { text } from '#lib/server/forms.ts';
import * as ops from '#lib/server/operations/lists.ts';
import { run } from '#lib/server/operations/registry.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import { attempt, requireUserId } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	try {
		return {
			list: await run(ops.getList, locals.user!.id, { listId: params.id }),
			// Without JavaScript, "edit" is a link back to this page with ?edit=<item id>.
			editingId: url.searchParams.get('edit')
		};
	} catch (cause) {
		if (cause instanceof ServiceError) error(404, 'List not found');
		throw cause;
	}
};

/** New items arrive as one name, or as a JSON array when several lines were pasted. */
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
			run(ops.addItems, userId, { listId: event.params.id, items: newItems(data) })
		);
	},

	toggle: async (event) => {
		const userId = requireUserId(event);
		const data = await event.request.formData();
		return attempt(() =>
			run(ops.updateItem, userId, {
				listId: event.params.id,
				itemId: text(data, 'id'),
				checked: text(data, 'checked') === 'true'
			})
		);
	},

	renameItem: async (event) => {
		const userId = requireUserId(event);
		const data = await event.request.formData();
		const failure = await attempt(() =>
			run(ops.updateItem, userId, {
				listId: event.params.id,
				itemId: text(data, 'id'),
				name: text(data, 'name')
			})
		);
		if (failure) return failure;
		// Leaves ?edit=... behind, so the row is no longer in edit mode.
		redirect(303, `/lists/${event.params.id}`);
	},

	deleteItem: async (event) => {
		const userId = requireUserId(event);
		const data = await event.request.formData();
		return attempt(() =>
			run(ops.removeItem, userId, { listId: event.params.id, itemId: text(data, 'id') })
		);
	},

	// Undo of a delete: the item comes back with its id, position and checked state.
	restoreItem: async (event) => {
		const userId = requireUserId(event);
		const data = await event.request.formData();
		return attempt(() =>
			run(ops.addItems, userId, {
				listId: event.params.id,
				items: [
					{
						id: text(data, 'id'),
						name: text(data, 'name'),
						checked: text(data, 'checked') === 'true',
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
			run(ops.renameList, userId, { listId: event.params.id, name: text(data, 'name') })
		);
	},

	uncheckAll: async (event) => {
		const userId = requireUserId(event);
		return attempt(() => run(ops.uncheckAll, userId, { listId: event.params.id }));
	},

	clearChecked: async (event) => {
		const userId = requireUserId(event);
		return attempt(() => run(ops.clearChecked, userId, { listId: event.params.id }));
	},

	delete: async (event) => {
		const userId = requireUserId(event);
		const failure = await attempt(() => run(ops.deleteList, userId, { listId: event.params.id }));
		if (failure) return failure;
		redirect(303, '/');
	}
};
