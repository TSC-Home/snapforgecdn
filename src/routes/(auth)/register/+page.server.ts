import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { register, hasAnyUsers } from '$lib/server/services/auth';
import { SESSION_COOKIE_NAME } from '$lib/server/services/session';
import { isRegistrationAllowed } from '$lib/server/services/settings';
import { getInvitationByToken } from '$lib/server/services/collaboration';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Redirect if already logged in
	if (locals.user) {
		throw redirect(302, '/dashboard');
	}

	// Check for invite token
	const inviteToken = url.searchParams.get('invite');
	const prefilledEmail = url.searchParams.get('email');
	let invitation = null;

	if (inviteToken) {
		invitation = await getInvitationByToken(inviteToken);
	}

	// Check if registration is allowed
	const hasUsers = await hasAnyUsers();

	if (hasUsers && !invitation) {
		// Check if registration is enabled in settings
		const registrationAllowed = await isRegistrationAllowed();

		if (!registrationAllowed) {
			throw redirect(302, '/login');
		}
	}

	return {
		isFirstUser: !hasUsers,
		invitation: invitation ? {
			token: inviteToken,
			email: invitation.email,
			galleryName: invitation.gallery.name
		} : null,
		prefilledEmail: prefilledEmail || invitation?.email || ''
	};
};

import { acceptInvitation } from '$lib/server/services/collaboration';

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';
		const inviteToken = formData.get('inviteToken')?.toString() ?? '';

		// Validate passwords match
		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match', email });
		}

		// Check if there's a valid invitation (allows bypassing registration disabled)
		let validInvitation = null;
		if (inviteToken) {
			validInvitation = await getInvitationByToken(inviteToken);
			// Verify email matches invitation
			if (validInvitation && validInvitation.email.toLowerCase() !== email.toLowerCase()) {
				return fail(400, { error: 'Email must match the invitation', email });
			}
		}

		const result = await register(email, password, {
			bypassRegistrationCheck: !!validInvitation
		});

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

		// If there's an invite token, try to accept the invitation
		if (inviteToken && result.user) {
			const acceptResult = await acceptInvitation(inviteToken, result.user.id);
			if (acceptResult.success && acceptResult.galleryId) {
				throw redirect(302, `/galleries/${acceptResult.galleryId}`);
			}
		}

		throw redirect(302, '/dashboard');
	}
};
