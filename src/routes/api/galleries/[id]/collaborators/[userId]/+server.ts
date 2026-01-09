import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateCollaboratorRole, removeCollaborator } from '$lib/server/services/collaboration';
import type { CollaboratorRole } from '$lib/server/db/schema';

const validRoles: CollaboratorRole[] = ['viewer', 'editor', 'manager'];

// PATCH /api/galleries/[id]/collaborators/[userId] - Update collaborator role
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id: galleryId, userId } = params;

	try {
		const body = await request.json();
		const { role } = body;

		if (!role || !validRoles.includes(role)) {
			return json({ error: 'Invalid role' }, { status: 400 });
		}

		const updated = await updateCollaboratorRole(galleryId, userId, role, locals.user.id);

		if (!updated) {
			return json({ error: 'Failed to update role or no permission' }, { status: 403 });
		}

		return json({ success: true });
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}
};

// DELETE /api/galleries/[id]/collaborators/[userId] - Remove collaborator
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id: galleryId, userId } = params;

	const removed = await removeCollaborator(galleryId, userId, locals.user.id);

	if (!removed) {
		return json({ error: 'Failed to remove collaborator or no permission' }, { status: 403 });
	}

	return new Response(null, { status: 204 });
};
