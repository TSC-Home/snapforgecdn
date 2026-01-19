import type { RequestHandler } from './$types';
import { getGalleryByToken } from '$lib/server/services/gallery';
import { uploadVideo } from '$lib/server/services/video';
import { config } from '$lib/server/config';

export const POST: RequestHandler = async ({ request }) => {
	// Get authorization token
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

	// Check if video uploads are enabled for this gallery
	if (gallery.videoEnabled === false) {
		return new Response(JSON.stringify({ error: 'Video uploads are disabled for this gallery' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Parse form data
	const formData = await request.formData();
	const file = formData.get('file');

	if (!file || !(file instanceof File)) {
		return new Response(JSON.stringify({ error: 'No file provided' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Check mime type
	if (!(config.videos.allowedMimeTypes as readonly string[]).includes(file.type)) {
		return new Response(JSON.stringify({
			error: `Invalid file type. Allowed: ${config.videos.allowedMimeTypes.join(', ')}`
		}), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Upload and process video
	const result = await uploadVideo(gallery.id, file, gallery);

	if (!result.success) {
		return new Response(JSON.stringify({ error: result.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return new Response(JSON.stringify({
		id: result.video!.id,
		filename: result.video!.originalFilename,
		width: result.video!.width,
		height: result.video!.height,
		duration: result.video!.duration,
		size: result.video!.sizeBytes,
		url: `/v/${result.video!.id}`,
		thumbnailUrl: result.video!.thumbnailPath ? `/v/${result.video!.id}?thumb` : null
	}), {
		status: 201,
		headers: { 'Content-Type': 'application/json' }
	});
};
