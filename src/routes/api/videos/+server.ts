import type { RequestHandler } from './$types';
import { getGalleryByToken } from '$lib/server/services/gallery';
import { getGalleryVideos, deleteVideo } from '$lib/server/services/video';

// GET - List videos
export const GET: RequestHandler = async ({ request, url }) => {
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

	const page = parseInt(url.searchParams.get('page') || '1');
	const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '50'));

	const { videos, total } = await getGalleryVideos(gallery.id, page, perPage);

	return new Response(JSON.stringify({
		videos: videos.map(v => ({
			id: v.id,
			filename: v.originalFilename,
			width: v.width,
			height: v.height,
			duration: v.duration,
			size: v.sizeBytes,
			status: v.processingStatus,
			url: `/v/${v.id}`,
			thumbnailUrl: v.thumbnailPath ? `/v/${v.id}?thumb` : null,
			createdAt: v.createdAt
		})),
		total,
		page,
		perPage,
		totalPages: Math.ceil(total / perPage)
	}), {
		headers: { 'Content-Type': 'application/json' }
	});
};

// DELETE - Batch delete videos
export const DELETE: RequestHandler = async ({ request }) => {
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

	const body = await request.json();
	const ids = body.ids as string[];

	if (!Array.isArray(ids) || ids.length === 0) {
		return new Response(JSON.stringify({ error: 'No video IDs provided' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	let deleted = 0;
	let failed = 0;

	for (const id of ids) {
		const result = await deleteVideo(id, gallery.id);
		if (result.success) {
			deleted++;
		} else {
			failed++;
		}
	}

	return new Response(JSON.stringify({ deleted, failed }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
