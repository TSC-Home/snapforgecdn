import { nanoid } from 'nanoid';
import { encodeBase64 } from '@oslojs/encoding';
import { db, schema } from '../db';
import { eq, count, and } from 'drizzle-orm';

export async function generateAccessToken(): Promise<string> {
	const bytes = crypto.getRandomValues(new Uint8Array(24));
	return encodeBase64(bytes);
}

export async function createGallery(userId: string, name: string): Promise<{ success: boolean; error?: string; gallery?: schema.Gallery }> {
	// Check user's gallery limit
	const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
	if (!user) {
		return { success: false, error: 'User not found' };
	}

	const galleryCount = await db
		.select({ count: count() })
		.from(schema.galleries)
		.where(eq(schema.galleries.userId, userId))
		.get();

	if ((galleryCount?.count ?? 0) >= user.maxGalleries) {
		return { success: false, error: `Maximum of ${user.maxGalleries} galleries reached` };
	}

	// Create gallery
	const gallery: schema.Gallery = {
		id: nanoid(),
		userId,
		name: name.trim(),
		accessToken: await generateAccessToken(),
		thumbSize: null,
		thumbQuality: null,
		imageQuality: null,
		outputFormat: null,
		resizeMethod: null,
		jpegQuality: null,
		webpQuality: null,
		avifQuality: null,
		pngCompressionLevel: null,
		effort: null,
		chromaSubsampling: null,
		stripMetadata: null,
		autoOrient: null,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	await db.insert(schema.galleries).values(gallery);

	return { success: true, gallery };
}

export async function getGallery(galleryId: string, userId: string): Promise<schema.Gallery | null> {
	// First get the gallery
	const gallery = await db
		.select()
		.from(schema.galleries)
		.where(eq(schema.galleries.id, galleryId))
		.get();

	if (!gallery) return null;

	// Check if user is owner
	if (gallery.userId === userId) {
		return gallery;
	}

	// Check if user is collaborator
	const collaborator = await db
		.select()
		.from(schema.galleryCollaborators)
		.where(
			and(
				eq(schema.galleryCollaborators.galleryId, galleryId),
				eq(schema.galleryCollaborators.userId, userId)
			)
		)
		.get();

	if (collaborator) {
		return gallery;
	}

	return null;
}

export async function getGalleryByToken(accessToken: string): Promise<schema.Gallery | null> {
	const gallery = await db
		.select()
		.from(schema.galleries)
		.where(eq(schema.galleries.accessToken, accessToken))
		.get();

	return gallery ?? null;
}

export async function getUserGalleries(userId: string): Promise<schema.Gallery[]> {
	return db.select().from(schema.galleries).where(eq(schema.galleries.userId, userId)).all();
}

type OutputFormat = 'original' | 'jpeg' | 'webp' | 'avif' | 'png';
type ResizeMethod = 'lanczos3' | 'lanczos2' | 'mitchell' | 'catrom' | 'nearest';
type ChromaSubsampling = '420' | '422' | '444';

export interface GalleryUpdateData {
	name?: string;
	thumbSize?: number | null;
	thumbQuality?: number | null;
	imageQuality?: number | null;
	outputFormat?: OutputFormat | null;
	resizeMethod?: ResizeMethod | null;
	jpegQuality?: number | null;
	webpQuality?: number | null;
	avifQuality?: number | null;
	pngCompressionLevel?: number | null;
	effort?: number | null;
	chromaSubsampling?: ChromaSubsampling | null;
	stripMetadata?: boolean | null;
	autoOrient?: boolean | null;
}

export async function updateGallery(galleryId: string, userId: string, data: GalleryUpdateData): Promise<{ success: boolean; error?: string }> {
	const gallery = await getGallery(galleryId, userId);
	if (!gallery) {
		return { success: false, error: 'Gallery not found' };
	}

	await db
		.update(schema.galleries)
		.set({
			name: data.name,
			thumbSize: data.thumbSize,
			thumbQuality: data.thumbQuality,
			imageQuality: data.imageQuality,
			outputFormat: data.outputFormat,
			resizeMethod: data.resizeMethod,
			jpegQuality: data.jpegQuality,
			webpQuality: data.webpQuality,
			avifQuality: data.avifQuality,
			pngCompressionLevel: data.pngCompressionLevel,
			effort: data.effort,
			chromaSubsampling: data.chromaSubsampling,
			stripMetadata: data.stripMetadata,
			autoOrient: data.autoOrient,
			updatedAt: new Date()
		})
		.where(eq(schema.galleries.id, galleryId));

	return { success: true };
}

export async function regenerateAccessToken(galleryId: string, userId: string): Promise<{ success: boolean; error?: string; token?: string }> {
	const gallery = await getGallery(galleryId, userId);
	if (!gallery) {
		return { success: false, error: 'Gallery not found' };
	}

	const newToken = await generateAccessToken();

	await db
		.update(schema.galleries)
		.set({
			accessToken: newToken,
			updatedAt: new Date()
		})
		.where(eq(schema.galleries.id, galleryId));

	return { success: true, token: newToken };
}

export async function deleteGallery(galleryId: string, userId: string): Promise<{ success: boolean; error?: string }> {
	const gallery = await getGallery(galleryId, userId);
	if (!gallery) {
		return { success: false, error: 'Gallery not found' };
	}

	// Images will be cascade deleted, but we need to delete files manually
	// This will be handled by the storage service

	await db.delete(schema.galleries).where(eq(schema.galleries.id, galleryId));

	return { success: true };
}

export async function getGalleryStats(galleryId: string): Promise<{ imageCount: number; totalSize: number }> {
	const result = await db
		.select({
			count: count(),
		})
		.from(schema.images)
		.where(eq(schema.images.galleryId, galleryId))
		.get();

	// Get total size separately
	const images = await db
		.select({ sizeBytes: schema.images.sizeBytes })
		.from(schema.images)
		.where(eq(schema.images.galleryId, galleryId))
		.all();

	const totalSize = images.reduce((sum, img) => sum + img.sizeBytes, 0);

	return {
		imageCount: result?.count ?? 0,
		totalSize
	};
}
