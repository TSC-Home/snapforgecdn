import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getInvitationByToken } from '$lib/server/services/collaboration';

// GET /api/invitations/[token] - Get invitation details
export const GET: RequestHandler = async ({ params }) => {
	const { token } = params;

	const invitation = await getInvitationByToken(token);

	if (!invitation) {
		return json({ error: 'Invitation not found or expired' }, { status: 404 });
	}

	return json({
		invitation: {
			id: invitation.id,
			email: invitation.email,
			role: invitation.role,
			expiresAt: invitation.expiresAt,
			gallery: invitation.gallery,
			inviter: invitation.inviter
		}
	});
};
