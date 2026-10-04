import { redirect } from '@sveltejs/kit';
import { text } from '#lib/server/forms.ts';
import { createList } from '#lib/server/operations/lists.ts';
import { run } from '#lib/server/operations/registry.ts';
import { createTemplate, listTemplates } from '#lib/server/operations/templates.ts';
import { attempt, requireUserId } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { templates: await run(listTemplates, locals.user!.id, {}) };
};

export const actions: Actions = {
	create: async (event) => {
		const userId = requireUserId(event);
		const data = await event.request.formData();

		let templateId = '';
		const failure = await attempt(async () => {
			templateId = (await run(createTemplate, userId, { name: text(data, 'name') })).id;
		});
		if (failure) return failure;

		redirect(303, `/templates/${templateId}`);
	},

	// Makes a new list with a copy of the template's items and opens it.
	use: async (event) => {
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
