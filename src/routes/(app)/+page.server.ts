import { redirect } from '@sveltejs/kit';
import { text } from '#lib/server/forms.ts';
import { createList } from '#lib/server/operations/lists.ts';
import { run } from '#lib/server/operations/registry.ts';
import { listTemplates } from '#lib/server/operations/templates.ts';
import { attempt, requireUserId } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { templates: await run(listTemplates, locals.user!.id, {}) };
};

export const actions: Actions = {
	create: async (event) => {
		const userId = requireUserId(event);
		const data = await event.request.formData();

		let listId = '';
		const failure = await attempt(async () => {
			const list = await run(createList, userId, { name: text(data, 'name') });
			listId = list.id;
		});
		if (failure) return failure;

		redirect(303, `/lists/${listId}`);
	},

	fromTemplate: async (event) => {
		const userId = requireUserId(event);
		const data = await event.request.formData();

		let listId = '';
		const failure = await attempt(async () => {
			listId = (await run(createList, userId, { templateId: text(data, 'templateId') })).id;
		});
		if (failure) return failure;

		redirect(303, `/lists/${listId}`);
	}
};
