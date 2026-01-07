import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getUserGalleries, deleteGallery, getGalleryStats } from '$lib/server/services/gallery';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	const galleries = await getUserGalleries(user.id);

	// Get stats for each gallery
	const galleriesWithStats = await Promise.all(
		galleries.map(async (gallery) => {
			const stats = await getGalleryStats(gallery.id);
			return { ...gallery, ...stats };
		})
	);

	return {
		galleries: galleriesWithStats,
		maxGalleries: user.maxGalleries
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const formData = await request.formData();
		const galleryId = formData.get('galleryId')?.toString();

		if (!galleryId) {
			return fail(400, { error: 'Gallery ID fehlt' });
		}

		const result = await deleteGallery(galleryId, locals.user!.id);

		if (!result.success) {
			return fail(400, { error: result.error });
		}

		return { success: true };
	}
};
