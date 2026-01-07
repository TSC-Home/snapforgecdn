import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getGallery, getGalleryStats, updateGallery, regenerateAccessToken } from '$lib/server/services/gallery';
import { db, schema } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, parent, url }) => {
	const { user } = await parent();

	const gallery = await getGallery(params.id, user.id);
	if (!gallery) {
		throw error(404, 'Gallery not found');
	}

	const stats = await getGalleryStats(gallery.id);

	// Get images with pagination
	const page = parseInt(url.searchParams.get('page') ?? '1');
	const perPage = 24;
	const offset = (page - 1) * perPage;

	const images = await db
		.select()
		.from(schema.images)
		.where(eq(schema.images.galleryId, gallery.id))
		.orderBy(desc(schema.images.createdAt))
		.limit(perPage)
		.offset(offset)
		.all();

	const totalPages = Math.ceil(stats.imageCount / perPage);

	// Get base URL for CDN links
	const baseUrl = url.origin;

	return {
		gallery,
		stats,
		images,
		pagination: {
			page,
			perPage,
			totalPages,
			total: stats.imageCount
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

		const thumbSizeStr = formData.get('thumbSize')?.toString();
		const thumbQualityStr = formData.get('thumbQuality')?.toString();
		const imageQualityStr = formData.get('imageQuality')?.toString();

		// Parse and validate
		const thumbSize = thumbSizeStr ? parseInt(thumbSizeStr) : null;
		const thumbQuality = thumbQualityStr ? parseInt(thumbQualityStr) : null;
		const imageQuality = imageQualityStr ? parseInt(imageQualityStr) : null;

		if (thumbSize !== null && (isNaN(thumbSize) || thumbSize < 50 || thumbSize > 500)) {
			return fail(400, { error: 'Thumbnail size must be between 50-500px', action: 'compression' });
		}

		if (thumbQuality !== null && (isNaN(thumbQuality) || thumbQuality < 10 || thumbQuality > 100)) {
			return fail(400, { error: 'Thumbnail quality must be between 10-100%', action: 'compression' });
		}

		if (imageQuality !== null && (isNaN(imageQuality) || imageQuality < 10 || imageQuality > 100)) {
			return fail(400, { error: 'Image quality must be between 10-100%', action: 'compression' });
		}

		const result = await updateGallery(params.id, locals.user!.id, {
			thumbSize,
			thumbQuality,
			imageQuality
		});

		if (!result.success) {
			return fail(400, { error: result.error, action: 'compression' });
		}

		return { success: true, action: 'compression' };
	}
};
