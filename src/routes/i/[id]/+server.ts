import type { RequestHandler } from './$types';
import { getImageBuffer, parseSize } from '$lib/server/services/image';

// Cache for 1 year (immutable content)
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

export const GET: RequestHandler = async ({ params, url }) => {
	const imageId = params.id;

	// Parse query parameters
	const sizeParam = url.searchParams.get('size');
	const isThumb = url.searchParams.has('thumb');

	const { width, height } = parseSize(sizeParam);

	const result = await getImageBuffer(imageId, {
		width,
		height,
		thumb: isThumb
	});

	if (!result) {
		return new Response('Not Found', { status: 404 });
	}

	return new Response(new Uint8Array(result.buffer), {
		headers: {
			'Content-Type': result.mimeType,
			'Content-Length': result.buffer.length.toString(),
			'Cache-Control': CACHE_CONTROL,
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
