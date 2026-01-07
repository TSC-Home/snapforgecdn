import type { PageServerLoad } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, count, sum } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	// Get user's galleries
	const galleries = await db
		.select()
		.from(schema.galleries)
		.where(eq(schema.galleries.userId, user.id));

	// Get image stats
	const galleryIds = galleries.map((g) => g.id);

	let totalImages = 0;
	let totalSize = 0;

	if (galleryIds.length > 0) {
		for (const galleryId of galleryIds) {
			const stats = await db
				.select({
					count: count(),
					size: sum(schema.images.sizeBytes)
				})
				.from(schema.images)
				.where(eq(schema.images.galleryId, galleryId))
				.get();

			totalImages += stats?.count ?? 0;
			totalSize += Number(stats?.size ?? 0);
		}
	}

	return {
		stats: {
			galleries: galleries.length,
			maxGalleries: user.maxGalleries,
			images: totalImages,
			storageUsed: totalSize
		}
	};
};
