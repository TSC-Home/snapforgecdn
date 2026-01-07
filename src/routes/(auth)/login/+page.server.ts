import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { login } from '$lib/server/services/auth';
import { SESSION_COOKIE_NAME } from '$lib/server/services/session';
import { hasAnyUsers } from '$lib/server/services/auth';

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect if already logged in
	if (locals.user) {
		throw redirect(302, '/dashboard');
	}

	// Check if any users exist - if not, redirect to register
	const hasUsers = await hasAnyUsers();
	if (!hasUsers) {
		throw redirect(302, '/register');
	}

	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		const result = await login(email, password);

		if (!result.success) {
			return fail(400, { error: result.error, email });
		}

		// Set session cookie
		cookies.set(SESSION_COOKIE_NAME, result.token!, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60 // 30 days
		});

		throw redirect(302, '/dashboard');
	}
};
