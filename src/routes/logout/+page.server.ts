import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { logout } from '$lib/server/services/auth';
import { SESSION_COOKIE_NAME } from '$lib/server/services/session';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get(SESSION_COOKIE_NAME);

	if (token) {
		await logout(token);
	}

	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });

	throw redirect(302, '/login');
};
