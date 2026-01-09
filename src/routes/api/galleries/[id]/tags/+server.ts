import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserGalleryPermissions } from '$lib/server/services/collaboration';
import { getGalleryTagsWithCounts, createTag, tagExistsInGallery } from '$lib/server/services/tags';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';

// GET /api/galleries/[id]/tags - List all tags for a gallery
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

	const tags = await getGalleryTagsWithCounts(galleryId);

	return json({ tags });
};

// POST /api/galleries/[id]/tags - Create a new tag
export const POST: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const galleryId = params.id;

	// Check permissions (need at least editor to create tags)
	const permissions = await getUserGalleryPermissions(locals.user.id, galleryId);
	if (!permissions?.canUpload) {
		return json({ error: 'Access denied' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const { name, color } = body;

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return json({ error: 'Tag name is required' }, { status: 400 });
		}

		// Check if tag already exists
		const exists = await tagExistsInGallery(galleryId, name);
		if (exists) {
			return json({ error: 'Tag already exists' }, { status: 409 });
		}

		const tag = await createTag(galleryId, name, color);

		return json({ tag }, { status: 201 });
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}
};
