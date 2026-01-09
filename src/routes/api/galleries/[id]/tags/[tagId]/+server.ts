import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserGalleryPermissions } from '$lib/server/services/collaboration';
import { getTag, updateTag, deleteTag } from '$lib/server/services/tags';

// PATCH /api/galleries/[id]/tags/[tagId] - Update a tag
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id: galleryId, tagId } = params;

	// Check permissions
	const permissions = await getUserGalleryPermissions(locals.user.id, galleryId);
	if (!permissions?.canUpload) {
		return json({ error: 'Access denied' }, { status: 403 });
	}

	// Verify tag belongs to gallery
	const tag = await getTag(tagId);
	if (!tag || tag.galleryId !== galleryId) {
		return json({ error: 'Tag not found' }, { status: 404 });
	}

	try {
		const body = await request.json();
		const { name, color } = body;

		const updated = await updateTag(tagId, { name, color });

		if (!updated) {
			return json({ error: 'No changes made' }, { status: 400 });
		}

		const updatedTag = await getTag(tagId);
		return json({ tag: updatedTag });
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}
};

// DELETE /api/galleries/[id]/tags/[tagId] - Delete a tag
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id: galleryId, tagId } = params;

	// Check permissions
	const permissions = await getUserGalleryPermissions(locals.user.id, galleryId);
	if (!permissions?.canDelete) {
		return json({ error: 'Access denied' }, { status: 403 });
	}

	// Verify tag belongs to gallery
	const tag = await getTag(tagId);
	if (!tag || tag.galleryId !== galleryId) {
		return json({ error: 'Tag not found' }, { status: 404 });
	}

	const deleted = await deleteTag(tagId);

	if (!deleted) {
		return json({ error: 'Failed to delete tag' }, { status: 500 });
	}

	return new Response(null, { status: 204 });
};
