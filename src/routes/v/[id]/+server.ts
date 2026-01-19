import type { RequestHandler } from './$types';
import { getVideo } from '$lib/server/services/video';
import { storage } from '$lib/server/services/storage';

// Cache for 1 year (immutable content)
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

export const GET: RequestHandler = async ({ params, url, request }) => {
	const videoId = params.id;
	const isThumb = url.searchParams.has('thumb');

	const video = await getVideo(videoId);

	if (!video) {
		return new Response('Not Found', { status: 404 });
	}

	// Return thumbnail if requested
	if (isThumb) {
		if (!video.thumbnailPath) {
			return new Response('No thumbnail available', { status: 404 });
		}

		try {
			const buffer = await storage.read(video.thumbnailPath);
			return new Response(new Uint8Array(buffer), {
				headers: {
					'Content-Type': 'image/jpeg',
					'Content-Length': buffer.length.toString(),
					'Cache-Control': CACHE_CONTROL,
					'X-Content-Type-Options': 'nosniff'
				}
			});
		} catch {
			return new Response('Thumbnail not found', { status: 404 });
		}
	}

	// Determine which video file to serve (processed or original)
	const videoPath = video.processedPath || video.storagePath;
	const mimeType = video.processedPath
		? (videoPath.endsWith('.webm') ? 'video/webm' : 'video/mp4')
		: video.mimeType;

	try {
		const buffer = await storage.read(videoPath);
		const fileSize = buffer.length;

		// Handle range requests for video streaming
		const rangeHeader = request.headers.get('range');

		if (rangeHeader) {
			const parts = rangeHeader.replace(/bytes=/, '').split('-');
			const start = parseInt(parts[0], 10);
			const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
			const chunkSize = end - start + 1;

			const chunk = buffer.subarray(start, end + 1);

			return new Response(new Uint8Array(chunk), {
				status: 206,
				headers: {
					'Content-Type': mimeType,
					'Content-Length': chunkSize.toString(),
					'Content-Range': `bytes ${start}-${end}/${fileSize}`,
					'Accept-Ranges': 'bytes',
					'Cache-Control': CACHE_CONTROL,
					'X-Content-Type-Options': 'nosniff'
				}
			});
		}

		// Return full video
		return new Response(new Uint8Array(buffer), {
			headers: {
				'Content-Type': mimeType,
				'Content-Length': fileSize.toString(),
				'Accept-Ranges': 'bytes',
				'Cache-Control': CACHE_CONTROL,
				'X-Content-Type-Options': 'nosniff'
			}
		});
	} catch {
		return new Response('Video not found', { status: 404 });
	}
};
