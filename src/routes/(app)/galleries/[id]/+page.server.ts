import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getGallery, getGalleryStats, updateGallery, regenerateAccessToken } from '$lib/server/services/gallery';
import { getGalleryTagsWithCounts, getImageTags } from '$lib/server/services/tags';
import { db, schema } from '$lib/server/db';
import { eq, desc, inArray, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, parent, url }) => {
	const { user } = await parent();

	const gallery = await getGallery(params.id, user.id);
	if (!gallery) {
		throw error(404, 'Gallery not found');
	}

	const stats = await getGalleryStats(gallery.id);

	// Get gallery tags with counts
	const tags = await getGalleryTagsWithCounts(gallery.id);

	// Get tag filter from URL
	const filterTagId = url.searchParams.get('tag');

	// Get images with pagination
	const page = parseInt(url.searchParams.get('page') ?? '1');
	const perPage = 24;
	const offset = (page - 1) * perPage;

	let imageQuery = db
		.select()
		.from(schema.images)
		.where(eq(schema.images.galleryId, gallery.id))
		.orderBy(desc(schema.images.createdAt));

	// If filtering by tag, get image IDs first
	let filteredImageIds: string[] | null = null;
	if (filterTagId) {
		const tagAssignments = await db
			.select({ imageId: schema.imageTagAssignments.imageId })
			.from(schema.imageTagAssignments)
			.where(eq(schema.imageTagAssignments.tagId, filterTagId));
		filteredImageIds = tagAssignments.map(a => a.imageId);

		if (filteredImageIds.length === 0) {
			// No images with this tag
			return {
				gallery,
				stats,
				tags,
				filterTagId,
				images: [],
				imageTagsMap: {},
				pagination: {
					page: 1,
					perPage,
					totalPages: 0,
					total: 0
				},
				baseUrl: url.origin
			};
		}
	}

	// Get total count for filtered images
	let totalCount = stats.imageCount;
	if (filteredImageIds) {
		totalCount = filteredImageIds.length;
	}

	// Apply filter and pagination
	let images;
	if (filteredImageIds) {
		images = await db
			.select()
			.from(schema.images)
			.where(and(
				eq(schema.images.galleryId, gallery.id),
				inArray(schema.images.id, filteredImageIds)
			))
			.orderBy(desc(schema.images.createdAt))
			.limit(perPage)
			.offset(offset)
			.all();
	} else {
		images = await imageQuery
			.limit(perPage)
			.offset(offset)
			.all();
	}

	// Get tags for each image
	const imageTagsMap: Record<string, { id: string; name: string; color: string | null }[]> = {};
	for (const image of images) {
		const imageTags = await getImageTags(image.id);
		imageTagsMap[image.id] = imageTags;
	}

	const totalPages = Math.ceil(totalCount / perPage);

	// Get base URL for CDN links
	const baseUrl = url.origin;

	return {
		gallery,
		stats,
		tags,
		filterTagId,
		images,
		imageTagsMap,
		pagination: {
			page,
			perPage,
			totalPages,
			total: totalCount
		},
		baseUrl
	};
};

export const actions: Actions = {
	rename: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim();

		if (!name || name.length < 2) {
			return fail(400, { error: 'Name must be at least 2 characters' });
		}

		const result = await updateGallery(params.id, locals.user!.id, { name });

		if (!result.success) {
			return fail(400, { error: result.error });
		}

		return { success: true, action: 'rename' };
	},

	regenerateToken: async ({ params, locals }) => {
		const result = await regenerateAccessToken(params.id, locals.user!.id);

		if (!result.success) {
			return fail(400, { error: result.error });
		}

		return { success: true, action: 'regenerateToken', token: result.token };
	},

	compression: async ({ request, params, locals }) => {
		const formData = await request.formData();

		// Parse form data
		const thumbSizeStr = formData.get('thumbSize')?.toString();
		const thumbQualityStr = formData.get('thumbQuality')?.toString();
		const outputFormatStr = formData.get('outputFormat')?.toString();
		const resizeMethodStr = formData.get('resizeMethod')?.toString();
		const jpegQualityStr = formData.get('jpegQuality')?.toString();
		const webpQualityStr = formData.get('webpQuality')?.toString();
		const avifQualityStr = formData.get('avifQuality')?.toString();
		const pngCompressionLevelStr = formData.get('pngCompressionLevel')?.toString();
		const effortStr = formData.get('effort')?.toString();
		const chromaSubsamplingStr = formData.get('chromaSubsampling')?.toString();
		const stripMetadata = formData.get('stripMetadata') === 'on';
		const autoOrient = formData.get('autoOrient') === 'on';

		// Parse numeric values
		const thumbSize = thumbSizeStr ? parseInt(thumbSizeStr) : null;
		const thumbQuality = thumbQualityStr ? parseInt(thumbQualityStr) : null;
		const jpegQuality = jpegQualityStr ? parseInt(jpegQualityStr) : null;
		const webpQuality = webpQualityStr ? parseInt(webpQualityStr) : null;
		const avifQuality = avifQualityStr ? parseInt(avifQualityStr) : null;
		const pngCompressionLevel = pngCompressionLevelStr ? parseInt(pngCompressionLevelStr) : null;
		const effort = effortStr ? parseInt(effortStr) : null;

		// Validate
		if (thumbSize !== null && (isNaN(thumbSize) || thumbSize < 50 || thumbSize > 500)) {
			return fail(400, { error: 'Thumbnail size must be between 50-500px', action: 'compression' });
		}

		if (thumbQuality !== null && (isNaN(thumbQuality) || thumbQuality < 10 || thumbQuality > 100)) {
			return fail(400, { error: 'Thumbnail quality must be between 10-100%', action: 'compression' });
		}

		if (jpegQuality !== null && (isNaN(jpegQuality) || jpegQuality < 1 || jpegQuality > 100)) {
			return fail(400, { error: 'JPEG quality must be between 1-100%', action: 'compression' });
		}

		if (webpQuality !== null && (isNaN(webpQuality) || webpQuality < 1 || webpQuality > 100)) {
			return fail(400, { error: 'WebP quality must be between 1-100%', action: 'compression' });
		}

		if (avifQuality !== null && (isNaN(avifQuality) || avifQuality < 1 || avifQuality > 100)) {
			return fail(400, { error: 'AVIF quality must be between 1-100%', action: 'compression' });
		}

		if (pngCompressionLevel !== null && (isNaN(pngCompressionLevel) || pngCompressionLevel < 0 || pngCompressionLevel > 9)) {
			return fail(400, { error: 'PNG compression must be between 0-9', action: 'compression' });
		}

		if (effort !== null && (isNaN(effort) || effort < 1 || effort > 10)) {
			return fail(400, { error: 'Effort must be between 1-10', action: 'compression' });
		}

		// Validate enum values
		const validFormats = ['', 'jpeg', 'webp', 'avif', 'png'];
		const validResizeMethods = ['', 'lanczos3', 'lanczos2', 'mitchell', 'catrom', 'nearest'];
		const validChromaSubsampling = ['', '420', '422', '444'];

		if (outputFormatStr && !validFormats.includes(outputFormatStr)) {
			return fail(400, { error: 'Invalid output format', action: 'compression' });
		}

		if (resizeMethodStr && !validResizeMethods.includes(resizeMethodStr)) {
			return fail(400, { error: 'Invalid resize method', action: 'compression' });
		}

		if (chromaSubsamplingStr && !validChromaSubsampling.includes(chromaSubsamplingStr)) {
			return fail(400, { error: 'Invalid chroma subsampling', action: 'compression' });
		}

		const result = await updateGallery(params.id, locals.user!.id, {
			thumbSize,
			thumbQuality,
			outputFormat: (outputFormatStr || null) as 'original' | 'jpeg' | 'webp' | 'avif' | 'png' | null,
			resizeMethod: (resizeMethodStr || null) as 'lanczos3' | 'lanczos2' | 'mitchell' | 'catrom' | 'nearest' | null,
			jpegQuality,
			webpQuality,
			avifQuality,
			pngCompressionLevel,
			effort,
			chromaSubsampling: (chromaSubsamplingStr || null) as '420' | '422' | '444' | null,
			stripMetadata,
			autoOrient
		});

		if (!result.success) {
			return fail(400, { error: result.error, action: 'compression' });
		}

		return { success: true, action: 'compression' };
	}
};
