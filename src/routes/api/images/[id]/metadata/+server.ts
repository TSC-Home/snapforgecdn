import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserGalleryPermissions } from '$lib/server/services/collaboration';
import { getImage, updateImageMetadata } from '$lib/server/services/image';

// PATCH /api/images/[id]/metadata - Update image metadata
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
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
		const { latitude, longitude, locationName, altitude, takenAt } = body;

		const updated = await updateImageMetadata(imageId, {
			latitude: latitude !== undefined ? latitude : undefined,
			longitude: longitude !== undefined ? longitude : undefined,
			locationName: locationName !== undefined ? locationName : undefined,
			altitude: altitude !== undefined ? altitude : undefined,
			takenAt: takenAt !== undefined ? (takenAt ? new Date(takenAt) : null) : undefined
		});

		if (!updated) {
			return json({ error: 'No changes made' }, { status: 400 });
		}

		// Return updated image
		const updatedImage = await getImage(imageId);
		return json({
			image: {
				id: updatedImage!.id,
				latitude: updatedImage!.latitude,
				longitude: updatedImage!.longitude,
				locationName: updatedImage!.locationName,
				altitude: updatedImage!.altitude,
				takenAt: updatedImage!.takenAt
			}
		});
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}
};
