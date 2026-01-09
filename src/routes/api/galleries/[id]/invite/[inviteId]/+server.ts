import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cancelInvitation } from '$lib/server/services/collaboration';

// DELETE /api/galleries/[id]/invite/[inviteId] - Cancel invitation
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { inviteId } = params;

	const cancelled = await cancelInvitation(inviteId, locals.user.id);

	if (!cancelled) {
		return json({ error: 'Failed to cancel invitation or no permission' }, { status: 403 });
	}

	return new Response(null, { status: 204 });
};
