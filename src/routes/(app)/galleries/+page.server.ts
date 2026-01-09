import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getUserGalleries, deleteGallery, getGalleryStats } from '$lib/server/services/gallery';
import { getUserAccessibleGalleries } from '$lib/server/services/collaboration';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	// Get all galleries user has access to (owned + shared)
	const accessibleGalleries = await getUserAccessibleGalleries(user.id);

	// Get stats for each gallery and mark ownership
	const galleriesWithStats = await Promise.all(
		accessibleGalleries.map(async ({ gallery, role }) => {
			const stats = await getGalleryStats(gallery.id);
			return {
				...gallery,
				...stats,
				role,
				isOwner: role === 'owner'
			};
		})
	);

	// Sort: owned first, then shared
	galleriesWithStats.sort((a, b) => {
		if (a.isOwner && !b.isOwner) return -1;
		if (!a.isOwner && b.isOwner) return 1;
		return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	});

	// Count only owned galleries for the limit
	const ownedCount = galleriesWithStats.filter(g => g.isOwner).length;

	return {
		galleries: galleriesWithStats,
		ownedCount,
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
