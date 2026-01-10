import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateApiRequest } from '$lib/server/services/api-auth';
import { getImage, deleteImage } from '$lib/server/services/image';
import { getImageTags } from '$lib/server/services/tags';

export const GET: RequestHandler = async (event) => {
	// Authenticate
	const auth = await authenticateApiRequest(event);
	if (!auth.authenticated) {
		return json({ error: auth.error }, { status: 401 });
	}

	const image = await getImage(event.params.id);

	if (!image) {
		return json({ error: 'Bild nicht gefunden' }, { status: 404 });
	}

	// Check if image belongs to the authenticated gallery
	if (image.galleryId !== auth.gallery!.id) {
		return json({ error: 'Zugriff verweigert' }, { status: 403 });
	}

	// Get tags for this image
	const tags = await getImageTags(image.id);

	const baseUrl = event.url.origin;

	return json({
		id: image.id,
		filename: image.originalFilename,
		mimeType: image.mimeType,
		size: image.sizeBytes,
		width: image.width,
		height: image.height,
		createdAt: image.createdAt,
		location: {
			latitude: image.latitude,
			longitude: image.longitude,
			altitude: image.altitude,
			name: image.locationName
		},
		takenAt: image.takenAt,
		tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
		urls: {
			original: `${baseUrl}/i/${image.id}`,
			thumb: `${baseUrl}/i/${image.id}?thumb`
		}
	});
};

export const DELETE: RequestHandler = async (event) => {
	// Authenticate
	const auth = await authenticateApiRequest(event);
	if (!auth.authenticated) {
		return json({ error: auth.error }, { status: 401 });
	}

	const image = await getImage(event.params.id);

	if (!image) {
		return json({ error: 'Bild nicht gefunden' }, { status: 404 });
	}

	// Check if image belongs to the authenticated gallery
	if (image.galleryId !== auth.gallery!.id) {
		return json({ error: 'Zugriff verweigert' }, { status: 403 });
	}

	const result = await deleteImage(event.params.id);

	if (!result.success) {
		return json({ error: result.error }, { status: 500 });
	}

	return new Response(null, { status: 204 });
};
