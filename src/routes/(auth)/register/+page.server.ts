import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { register, hasAnyUsers } from '$lib/server/services/auth';
import { SESSION_COOKIE_NAME } from '$lib/server/services/session';
import { isRegistrationAllowed } from '$lib/server/services/settings';

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect if already logged in
	if (locals.user) {
		throw redirect(302, '/dashboard');
	}

	// Check if registration is allowed
	const hasUsers = await hasAnyUsers();

	if (hasUsers) {
		// Check if registration is enabled in settings
		const registrationAllowed = await isRegistrationAllowed();

		if (!registrationAllowed) {
			throw redirect(302, '/login');
		}
	}

	return {
		isFirstUser: !hasUsers
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';

		// Validate passwords match
		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match', email });
		}

		const result = await register(email, password);

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
