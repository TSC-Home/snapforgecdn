import type { RequestHandler } from './$types';
import { getGalleryByToken } from '$lib/server/services/gallery';
import { getVideo, deleteVideo } from '$lib/server/services/video';

// GET - Get video info
export const GET: RequestHandler = async ({ params, request }) => {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const token = authHeader.slice(7);
	const gallery = await getGalleryByToken(token);

	if (!gallery) {
		return new Response(JSON.stringify({ error: 'Invalid access token' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const video = await getVideo(params.id);

	if (!video || video.galleryId !== gallery.id) {
		return new Response(JSON.stringify({ error: 'Video not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return new Response(JSON.stringify({
		id: video.id,
		filename: video.originalFilename,
		width: video.width,
		height: video.height,
		duration: video.duration,
		size: video.sizeBytes,
		status: video.processingStatus,
		url: `/v/${video.id}`,
		thumbnailUrl: video.thumbnailPath ? `/v/${video.id}?thumb` : null,
		latitude: video.latitude,
		longitude: video.longitude,
		locationName: video.locationName,
		createdAt: video.createdAt
	}), {
		headers: { 'Content-Type': 'application/json' }
	});
};

// DELETE - Delete single video
export const DELETE: RequestHandler = async ({ params, request }) => {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const token = authHeader.slice(7);
	const gallery = await getGalleryByToken(token);

	if (!gallery) {
		return new Response(JSON.stringify({ error: 'Invalid access token' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const result = await deleteVideo(params.id, gallery.id);

	if (!result.success) {
		return new Response(JSON.stringify({ error: result.error }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return new Response(JSON.stringify({ success: true }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
