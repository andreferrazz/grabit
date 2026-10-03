import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, route }) => {
	// A signed-in user has no use for sign-in or sign-up, but may still follow a reset link.
	if (locals.user && route.id !== '/(auth)/reset-password') {
		redirect(303, '/');
	}
};
