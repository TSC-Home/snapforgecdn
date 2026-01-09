import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { acceptInvitation } from '$lib/server/services/collaboration';

// POST /api/invitations/[token]/accept - Accept invitation
export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'You must be logged in to accept an invitation' }, { status: 401 });
	}

	const { token } = params;

	const result = await acceptInvitation(token, locals.user.id);

	if (!result.success) {
		return json({ error: result.error }, { status: 400 });
	}

	return json({
		success: true,
		galleryId: result.galleryId
	});
};
