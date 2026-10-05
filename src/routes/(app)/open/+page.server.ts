import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Where the app starts: the installed app's start_url and the landing page after
 * sign-in. Goes to the user's default list, or to the overview when there is none.
 */
export const load: PageServerLoad = async ({ parent }) => {
	const { lists } = await parent();
	const list = lists.find((list) => list.isDefault);
	redirect(303, list ? `/lists/${list.id}` : '/');
};
