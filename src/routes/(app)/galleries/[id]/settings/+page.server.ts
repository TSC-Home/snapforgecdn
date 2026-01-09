import { redirect, fail } from '@sveltejs/kit';
import { getGallery, updateGallery, deleteGallery, regenerateAccessToken, getGalleryStats } from '$lib/server/services/gallery';
import { getGalleryCollaborators } from '$lib/server/services/collaboration';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const gallery = await getGallery(params.id, locals.user.id);
	if (!gallery) {
		throw redirect(302, '/galleries');
	}

	// Only owner can access settings
	if (gallery.userId !== locals.user.id) {
		throw redirect(302, `/galleries/${params.id}`);
	}

	const [stats, collaborators] = await Promise.all([
		getGalleryStats(params.id),
		getGalleryCollaborators(params.id)
	]);

	return {
		gallery,
		stats,
		collaboratorCount: collaborators.length
	};
};

export const actions: Actions = {
	rename: async ({ params, request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized', action: 'rename' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();

		if (!name || name.length < 1) {
			return fail(400, { error: 'Name is required', action: 'rename' });
		}

		const result = await updateGallery(params.id, locals.user.id, { name });
		if (!result.success) {
			return fail(400, { error: result.error, action: 'rename' });
		}

		return { success: true, action: 'rename' };
	},

	compression: async ({ params, request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized', action: 'compression' });
		}

		const formData = await request.formData();

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

		const thumbSize = thumbSizeStr ? parseInt(thumbSizeStr) : null;
		const thumbQuality = thumbQualityStr ? parseInt(thumbQualityStr) : null;
		const jpegQuality = jpegQualityStr ? parseInt(jpegQualityStr) : null;
		const webpQuality = webpQualityStr ? parseInt(webpQualityStr) : null;
		const avifQuality = avifQualityStr ? parseInt(avifQualityStr) : null;
		const pngCompressionLevel = pngCompressionLevelStr ? parseInt(pngCompressionLevelStr) : null;
		const effort = effortStr ? parseInt(effortStr) : null;

		const result = await updateGallery(params.id, locals.user.id, {
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
	},

	regenerateToken: async ({ params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized', action: 'regenerateToken' });
		}

		const result = await regenerateAccessToken(params.id, locals.user.id);
		if (!result.success) {
			return fail(400, { error: result.error, action: 'regenerateToken' });
		}

		return { success: true, action: 'regenerateToken' };
	},

	delete: async ({ params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized', action: 'delete' });
		}

		const result = await deleteGallery(params.id, locals.user.id);
		if (!result.success) {
			return fail(400, { error: result.error, action: 'delete' });
		}

		throw redirect(302, '/galleries');
	}
};
