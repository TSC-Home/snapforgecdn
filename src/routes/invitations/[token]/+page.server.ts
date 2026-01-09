import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getInvitationByToken, acceptInvitation } from '$lib/server/services/collaboration';

export const load: PageServerLoad = async ({ params, locals }) => {
	const invitation = await getInvitationByToken(params.token);

	if (!invitation) {
		return {
			invitation: null,
			error: 'This invitation is invalid or has expired.'
		};
	}

	// Check if user is logged in
	const isLoggedIn = !!locals.user;
	const currentUserEmail = locals.user?.email;

	// Check if email matches
	const emailMatches = currentUserEmail?.toLowerCase() === invitation.email.toLowerCase();

	return {
		invitation: {
			id: invitation.id,
			email: invitation.email,
			role: invitation.role,
			expiresAt: invitation.expiresAt,
			gallery: invitation.gallery,
			inviter: invitation.inviter
		},
		isLoggedIn,
		currentUserEmail,
		emailMatches,
		token: params.token
	};
};

export const actions: Actions = {
	accept: async ({ params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in to accept this invitation' });
		}

		const result = await acceptInvitation(params.token, locals.user.id);

		if (!result.success) {
			return fail(400, { error: result.error });
		}

		throw redirect(302, `/galleries/${result.galleryId}`);
	}
};
