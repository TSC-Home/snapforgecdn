import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateApiRequest } from '$lib/server/services/api-auth';
import { deleteImages } from '$lib/server/services/image';
import { db, schema } from '$lib/server/db';
import { eq, desc, count } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	// Authenticate
	const auth = await authenticateApiRequest(event);
	if (!auth.authenticated) {
		return json({ error: auth.error }, { status: 401 });
	}

	const page = parseInt(event.url.searchParams.get('page') ?? '1');
	const perPage = Math.min(parseInt(event.url.searchParams.get('perPage') ?? '50'), 100);
	const offset = (page - 1) * perPage;

	// Get total count
	const totalResult = await db
		.select({ count: count() })
		.from(schema.images)
		.where(eq(schema.images.galleryId, auth.gallery!.id))
		.get();

	const total = totalResult?.count ?? 0;

	// Get images
	const images = await db
		.select()
		.from(schema.images)
		.where(eq(schema.images.galleryId, auth.gallery!.id))
		.orderBy(desc(schema.images.createdAt))
		.limit(perPage)
		.offset(offset)
		.all();

	const baseUrl = event.url.origin;

	return json({
		images: images.map((img) => ({
			id: img.id,
			filename: img.originalFilename,
			mimeType: img.mimeType,
			size: img.sizeBytes,
			width: img.width,
			height: img.height,
			createdAt: img.createdAt,
			urls: {
				original: `${baseUrl}/i/${img.id}`,
				thumb: `${baseUrl}/i/${img.id}?thumb`
			}
		})),
		pagination: {
			page,
			perPage,
			total,
			totalPages: Math.ceil(total / perPage)
		}
	});
};

export const DELETE: RequestHandler = async (event) => {
	// Authenticate
	const auth = await authenticateApiRequest(event);
	if (!auth.authenticated) {
		return json({ error: auth.error }, { status: 401 });
	}

	try {
		const body = await event.request.json();
		const ids = body.ids;

		if (!Array.isArray(ids) || ids.length === 0) {
			return json({ error: 'ids Array erforderlich' }, { status: 400 });
		}

		// Verify all images belong to this gallery
		for (const id of ids) {
			const image = await db
				.select()
				.from(schema.images)
				.where(eq(schema.images.id, id))
				.get();

			if (image && image.galleryId !== auth.gallery!.id) {
				return json({ error: 'Zugriff verweigert' }, { status: 403 });
			}
		}

		const result = await deleteImages(ids);

		return json({ deleted: result.count });
	} catch (e) {
		return json({ error: 'Ungueltiger Request Body' }, { status: 400 });
	}
};
