import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserGalleryPermissions, getGalleryCollaborators } from '$lib/server/services/collaboration';

// GET /api/galleries/[id]/collaborators - List all collaborators
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const galleryId = params.id;

	// Check permissions
	const permissions = await getUserGalleryPermissions(locals.user.id, galleryId);
	if (!permissions?.canView) {
		return json({ error: 'Access denied' }, { status: 403 });
	}

	const collaborators = await getGalleryCollaborators(galleryId);

	return json({
		collaborators: collaborators.map(c => ({
			id: c.id,
			userId: c.userId,
			email: c.user.email,
			role: c.role,
			invitedAt: c.invitedAt,
			acceptedAt: c.acceptedAt
		}))
	});
};
