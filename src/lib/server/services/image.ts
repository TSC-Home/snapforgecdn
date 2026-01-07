import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { storage } from './storage';
import { config } from '../config';

export interface ProcessedImage {
	buffer: Buffer;
	width: number;
	height: number;
	format: string;
}

export interface UploadResult {
	success: boolean;
	error?: string;
	image?: schema.Image;
}

export interface ResizeOptions {
	width?: number;
	height?: number;
	thumb?: boolean;
	// Gallery-specific overrides
	thumbSize?: number;
	thumbQuality?: number;
	imageQuality?: number;
}

// Parse size parameter: "800", "x600", "800x600"
export function parseSize(sizeParam: string | null): { width?: number; height?: number } {
	if (!sizeParam) return {};

	const match = sizeParam.match(/^(\d+)?x?(\d+)?$/);
	if (!match) return {};

	const [, w, h] = match;
	return {
		width: w ? parseInt(w) : undefined,
		height: h ? parseInt(h) : undefined
	};
}

export async function processImage(
	buffer: Buffer,
	options: ResizeOptions = {}
): Promise<ProcessedImage> {
	let image = sharp(buffer);
	const metadata = await image.metadata();

	// Use gallery-specific settings or fall back to system defaults
	const thumbSize = options.thumbSize ?? config.images.thumbSize;
	const thumbQuality = options.thumbQuality ?? config.images.thumbQuality;
	const imageQuality = options.imageQuality;

	if (options.thumb) {
		// Thumbnail: small, proportional, high compression (maintains aspect ratio)
		image = image
			.resize(thumbSize, thumbSize, {
				fit: 'inside',
				withoutEnlargement: true
			})
			.jpeg({ quality: thumbQuality });
	} else if (options.width || options.height) {
		// Custom resize
		if (options.width && options.height) {
			// Both dimensions: crop to exact size
			image = image.resize(options.width, options.height, {
				fit: 'cover',
				position: 'center'
			});
		} else {
			// Single dimension: proportional resize
			image = image.resize(options.width, options.height, {
				fit: 'inside',
				withoutEnlargement: true
			});
		}
		// Apply image quality if specified
		if (imageQuality) {
			image = image.jpeg({ quality: imageQuality });
		}
	} else if (imageQuality) {
		// Just compress without resizing
		image = image.jpeg({ quality: imageQuality });
	}

	const processed = await image.toBuffer({ resolveWithObject: true });

	return {
		buffer: processed.data,
		width: processed.info.width,
		height: processed.info.height,
		format: processed.info.format
	};
}

export async function uploadImage(
	galleryId: string,
	file: File
): Promise<UploadResult> {
	// Validate gallery exists
	const gallery = await db
		.select()
		.from(schema.galleries)
		.where(eq(schema.galleries.id, galleryId))
		.get();

	if (!gallery) {
		return { success: false, error: 'Gallery not found' };
	}

	// Validate file type
	if (!config.images.allowedMimeTypes.includes(file.type as typeof config.images.allowedMimeTypes[number])) {
		return { success: false, error: 'File type not allowed' };
	}

	// Validate file size
	if (file.size > config.images.maxUploadSize) {
		return { success: false, error: 'File too large (max 50MB)' };
	}

	try {
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Get image metadata
		const metadata = await sharp(buffer).metadata();
		if (!metadata.width || !metadata.height) {
			return { success: false, error: 'Invalid image file' };
		}

		// Generate unique filename
		const imageId = nanoid();
		const extension = file.type.split('/')[1] || 'jpg';
		const filename = `${imageId}.${extension}`;
		const storagePath = `${galleryId}/${filename}`;

		// Save original image
		await storage.save(storagePath, buffer);

		// Create database record
		const image: schema.Image = {
			id: imageId,
			galleryId,
			filename,
			originalFilename: file.name,
			mimeType: file.type,
			sizeBytes: file.size,
			width: metadata.width,
			height: metadata.height,
			storagePath,
			createdAt: new Date()
		};

		await db.insert(schema.images).values(image);

		return { success: true, image };
	} catch (e) {
		console.error('Upload error:', e);
		return { success: false, error: 'Upload failed' };
	}
}

export async function getImage(imageId: string): Promise<schema.Image | null> {
	const image = await db
		.select()
		.from(schema.images)
		.where(eq(schema.images.id, imageId))
		.get();

	return image ?? null;
}

export async function getImageBuffer(
	imageId: string,
	options: ResizeOptions = {}
): Promise<{ buffer: Buffer; mimeType: string } | null> {
	const image = await getImage(imageId);
	if (!image) return null;

	try {
		const originalBuffer = await storage.read(image.storagePath);

		// If no resize options, return original
		if (!options.width && !options.height && !options.thumb) {
			return { buffer: originalBuffer, mimeType: image.mimeType };
		}

		// Get gallery settings for compression
		const gallery = await db
			.select()
			.from(schema.galleries)
			.where(eq(schema.galleries.id, image.galleryId))
			.get();

		// Merge gallery settings with options
		const processOptions: ResizeOptions = {
			...options,
			thumbSize: gallery?.thumbSize ?? undefined,
			thumbQuality: gallery?.thumbQuality ?? undefined,
			imageQuality: gallery?.imageQuality ?? undefined
		};

		// Process image
		const processed = await processImage(originalBuffer, processOptions);

		// Determine mime type based on format
		let mimeType = image.mimeType;
		if (options.thumb || processOptions.imageQuality) {
			mimeType = 'image/jpeg';
		}

		return { buffer: processed.buffer, mimeType };
	} catch (e) {
		console.error('Error reading image:', e);
		return null;
	}
}

export async function deleteImage(imageId: string): Promise<{ success: boolean; error?: string }> {
	const image = await getImage(imageId);
	if (!image) {
		return { success: false, error: 'Image not found' };
	}

	try {
		// Delete from storage
		await storage.delete(image.storagePath);

		// Delete from database
		await db.delete(schema.images).where(eq(schema.images.id, imageId));

		return { success: true };
	} catch (e) {
		console.error('Error deleting image:', e);
		return { success: false, error: 'Delete failed' };
	}
}

export async function deleteImages(imageIds: string[]): Promise<{ success: boolean; count: number }> {
	let count = 0;

	for (const id of imageIds) {
		const result = await deleteImage(id);
		if (result.success) count++;
	}

	return { success: true, count };
}
