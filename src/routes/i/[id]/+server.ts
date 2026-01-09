import type { RequestHandler } from './$types';
import { getImageBuffer, parseSize } from '$lib/server/services/image';

// Cache for 1 year (immutable content)
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

// Determine best format based on Accept header
function getBestFormat(acceptHeader: string | null, requestedFormat: string | null): string | undefined {
	// If format explicitly requested, use that
	if (requestedFormat) {
		const validFormats = ['jpeg', 'jpg', 'webp', 'avif', 'png'];
		if (validFormats.includes(requestedFormat.toLowerCase())) {
			return requestedFormat.toLowerCase();
		}
	}

	// Auto-detect based on Accept header
	if (!acceptHeader) return undefined;

	// Priority: AVIF > WebP > original (if browser supports)
	if (acceptHeader.includes('image/avif')) {
		return 'avif';
	}
	if (acceptHeader.includes('image/webp')) {
		return 'webp';
	}

	// Return undefined to use original/gallery default format
	return undefined;
}

export const GET: RequestHandler = async ({ params, url, request }) => {
	const imageId = params.id;

	// Parse query parameters
	const sizeParam = url.searchParams.get('size');
	const widthParam = url.searchParams.get('w');
	const heightParam = url.searchParams.get('h');
	const qualityParam = url.searchParams.get('q');
	const formatParam = url.searchParams.get('f') || url.searchParams.get('format');
	const autoFormat = url.searchParams.has('auto'); // ?auto enables Accept-header based format
	const isThumb = url.searchParams.has('thumb');

	// Parse size (supports "size=800x600" or "w=800&h=600")
	let { width, height } = parseSize(sizeParam);
	if (widthParam) width = parseInt(widthParam) || undefined;
	if (heightParam) height = parseInt(heightParam) || undefined;

	// Parse quality (1-100)
	const quality = qualityParam ? Math.min(100, Math.max(1, parseInt(qualityParam))) : undefined;

	// Determine output format
	const acceptHeader = request.headers.get('accept');
	const format = autoFormat
		? getBestFormat(acceptHeader, formatParam)
		: formatParam || undefined;

	const result = await getImageBuffer(imageId, {
		width,
		height,
		thumb: isThumb,
		format,
		quality
	});

	if (!result) {
		return new Response('Not Found', { status: 404 });
	}

	// Build Vary header for proper caching when auto-format is enabled
	const headers: Record<string, string> = {
		'Content-Type': result.mimeType,
		'Content-Length': result.buffer.length.toString(),
		'Cache-Control': CACHE_CONTROL,
		'X-Content-Type-Options': 'nosniff'
	};

	// Add Vary header if auto-format was used
	if (autoFormat) {
		headers['Vary'] = 'Accept';
	}

	return new Response(new Uint8Array(result.buffer), { headers });
};
