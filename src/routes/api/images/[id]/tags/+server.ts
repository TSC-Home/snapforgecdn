import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserGalleryPermissions } from '$lib/server/services/collaboration';
import { getImageTags, setImageTags } from '$lib/server/services/tags';
import { getImage } from '$lib/server/services/image';

// GET /api/images/[id]/tags - Get tags for an image
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const imageId = params.id;

	// Get image to check gallery
	const image = await getImage(imageId);
	if (!image) {
		return json({ error: 'Image not found' }, { status: 404 });
	}

	// Check permissions
	const permissions = await getUserGalleryPermissions(locals.user.id, image.galleryId);
	if (!permissions?.canView) {
		return json({ error: 'Access denied' }, { status: 403 });
	}

	const tags = await getImageTags(imageId);

	return json({ tags });
};

// POST /api/images/[id]/tags - Set tags for an image
export const POST: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const imageId = params.id;

	// Get image to check gallery
	const image = await getImage(imageId);
	if (!image) {
		return json({ error: 'Image not found' }, { status: 404 });
	}

	// Check permissions
	const permissions = await getUserGalleryPermissions(locals.user.id, image.galleryId);
	if (!permissions?.canUpload) {
		return json({ error: 'Access denied' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const { tagIds } = body;

		if (!Array.isArray(tagIds)) {
			return json({ error: 'tagIds must be an array' }, { status: 400 });
		}

		await setImageTags(imageId, tagIds);

		const tags = await getImageTags(imageId);
		return json({ tags });
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}
};
