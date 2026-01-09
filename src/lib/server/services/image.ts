import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { storage } from './storage';
import { config } from '../config';
import type { Gallery } from '../db/schema';

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

// Advanced processing options (based on gallery settings)
export interface AdvancedProcessingOptions extends ResizeOptions {
	outputFormat?: 'original' | 'jpeg' | 'webp' | 'avif' | 'png';
	resizeMethod?: 'lanczos3' | 'lanczos2' | 'mitchell' | 'catrom' | 'nearest';
	jpegQuality?: number;
	webpQuality?: number;
	avifQuality?: number;
	pngCompressionLevel?: number;
	effort?: number;
	chromaSubsampling?: '420' | '422' | '444';
	stripMetadata?: boolean;
	autoOrient?: boolean;
}

// EXIF location data extracted from image
export interface ExifLocationData {
	latitude?: number;
	longitude?: number;
	altitude?: number;
	takenAt?: Date;
}

// Image metadata update data
export interface ImageMetadataUpdate {
	latitude?: number | null;
	longitude?: number | null;
	locationName?: string | null;
	altitude?: number | null;
	takenAt?: Date | null;
}

// Resize method mapping for Sharp
const resizeMethodMap = {
	lanczos3: 'lanczos3',
	lanczos2: 'lanczos2',
	mitchell: 'mitchell',
	catrom: 'cubic',
	nearest: 'nearest'
} as const;

// Convert DMS (degrees, minutes, seconds) to decimal degrees
function dmsToDecimal(dms: number[], ref: string): number {
	if (!dms || dms.length < 3) return 0;
	const degrees = dms[0] + dms[1] / 60 + dms[2] / 3600;
	return (ref === 'S' || ref === 'W') ? -degrees : degrees;
}

// Extract EXIF location data from image buffer
export async function extractExifLocation(buffer: Buffer): Promise<ExifLocationData> {
	try {
		const metadata = await sharp(buffer).metadata();
		const result: ExifLocationData = {};

		if (metadata.exif) {
			// Sharp provides parsed EXIF data, but we need to access raw values
			// For GPS data, we'll try to extract from the EXIF buffer
			try {
				// Use sharp's withMetadata to preserve EXIF when processing
				// The actual GPS parsing is complex, so we'll look for common patterns
				const exifData = metadata.exif;

				// Try to parse GPS data from EXIF buffer
				// This is a simplified approach - full EXIF parsing would require a dedicated library
				if (metadata.orientation) {
					// EXIF data is present
				}
			} catch {
				// EXIF parsing failed, continue without GPS data
			}
		}

		// Parse datetime from metadata
		if (metadata.exif) {
			// Try to extract date from EXIF
			// Note: Full implementation would require parsing the EXIF buffer
		}

		return result;
	} catch {
		return {};
	}
}

// Get MIME type for output format
function getMimeType(format: string): string {
	const mimeTypes: Record<string, string> = {
		jpeg: 'image/jpeg',
		jpg: 'image/jpeg',
		png: 'image/png',
		webp: 'image/webp',
		avif: 'image/avif',
		gif: 'image/gif'
	};
	return mimeTypes[format] || 'image/jpeg';
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

// Advanced image processing with full control (like Squoosh)
export async function processImageAdvanced(
	buffer: Buffer,
	options: AdvancedProcessingOptions = {},
	originalFormat?: string
): Promise<ProcessedImage> {
	let image = sharp(buffer);
	const metadata = await image.metadata();

	// Auto-orient based on EXIF
	if (options.autoOrient !== false) {
		image = image.rotate(); // Auto-rotate based on EXIF orientation
	}

	// Get resize kernel
	const kernel = options.resizeMethod
		? (resizeMethodMap[options.resizeMethod as keyof typeof resizeMethodMap] as keyof sharp.KernelEnum)
		: undefined;

	// Apply resize if needed
	if (options.thumb) {
		const thumbSize = options.thumbSize ?? config.images.thumbSize;
		const thumbQuality = options.thumbQuality ?? config.images.thumbQuality;
		image = image
			.resize(thumbSize, thumbSize, {
				fit: 'inside',
				withoutEnlargement: true,
				kernel
			})
			.jpeg({ quality: thumbQuality });
	} else if (options.width || options.height) {
		if (options.width && options.height) {
			image = image.resize(options.width, options.height, {
				fit: 'cover',
				position: 'center',
				kernel
			});
		} else {
			image = image.resize(options.width, options.height, {
				fit: 'inside',
				withoutEnlargement: true,
				kernel
			});
		}
	}

	// Determine output format
	const targetFormat = options.outputFormat === 'original'
		? (originalFormat?.split('/')[1] || metadata.format || 'jpeg')
		: (options.outputFormat || 'jpeg');

	// Apply format-specific encoding
	switch (targetFormat) {
		case 'webp':
			image = image.webp({
				quality: options.webpQuality ?? 80,
				effort: options.effort ?? 4,
				smartSubsample: options.chromaSubsampling === '420'
			});
			break;
		case 'avif':
			image = image.avif({
				quality: options.avifQuality ?? 50,
				effort: options.effort ?? 4,
				chromaSubsampling: options.chromaSubsampling === '444' ? '4:4:4' : '4:2:0'
			});
			break;
		case 'png':
			image = image.png({
				compressionLevel: options.pngCompressionLevel ?? 6,
				effort: options.effort ?? 7
			});
			break;
		case 'jpeg':
		case 'jpg':
		default:
			const jpegQuality = options.jpegQuality ?? options.imageQuality ?? 80;
			image = image.jpeg({
				quality: jpegQuality,
				chromaSubsampling: options.chromaSubsampling === '444' ? '4:4:4' : '4:2:0'
			});
			break;
	}

	// Strip metadata if requested
	if (options.stripMetadata) {
		image = image.withMetadata({ orientation: undefined });
	}

	const processed = await image.toBuffer({ resolveWithObject: true });

	return {
		buffer: processed.data,
		width: processed.info.width,
		height: processed.info.height,
		format: processed.info.format
	};
}

// Build advanced options from gallery settings
export function buildAdvancedOptionsFromGallery(gallery: Gallery | null): AdvancedProcessingOptions {
	if (!gallery) return {};

	return {
		thumbSize: gallery.thumbSize ?? undefined,
		thumbQuality: gallery.thumbQuality ?? undefined,
		imageQuality: gallery.imageQuality ?? undefined,
		outputFormat: gallery.outputFormat as AdvancedProcessingOptions['outputFormat'] ?? undefined,
		resizeMethod: gallery.resizeMethod as AdvancedProcessingOptions['resizeMethod'] ?? undefined,
		jpegQuality: gallery.jpegQuality ?? undefined,
		webpQuality: gallery.webpQuality ?? undefined,
		avifQuality: gallery.avifQuality ?? undefined,
		pngCompressionLevel: gallery.pngCompressionLevel ?? undefined,
		effort: gallery.effort ?? undefined,
		chromaSubsampling: gallery.chromaSubsampling as AdvancedProcessingOptions['chromaSubsampling'] ?? undefined,
		stripMetadata: gallery.stripMetadata ?? undefined,
		autoOrient: gallery.autoOrient ?? true
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
		let buffer = Buffer.from(arrayBuffer);

		// Get image metadata before processing
		const originalMetadata = await sharp(buffer).metadata();
		if (!originalMetadata.width || !originalMetadata.height) {
			return { success: false, error: 'Invalid image file' };
		}

		// Extract EXIF location data before any processing
		const exifData = await extractExifLocation(buffer);

		// Check if gallery has compression/processing settings
		const hasProcessingSettings = gallery.outputFormat || gallery.jpegQuality ||
			gallery.webpQuality || gallery.avifQuality || gallery.imageQuality ||
			gallery.stripMetadata || gallery.resizeMethod || gallery.effort ||
			gallery.chromaSubsampling || gallery.pngCompressionLevel;

		let processedBuffer: Buffer = buffer;
		let finalMimeType = file.type;
		let finalWidth = originalMetadata.width;
		let finalHeight = originalMetadata.height;
		let finalSize = file.size;

		// Apply gallery compression settings if configured
		if (hasProcessingSettings) {
			const advancedOptions = buildAdvancedOptionsFromGallery(gallery);
			const processed = await processImageAdvanced(buffer, advancedOptions, file.type);
			processedBuffer = processed.buffer as Buffer;
			finalWidth = processed.width;
			finalHeight = processed.height;
			finalSize = processed.buffer.length;
			finalMimeType = getMimeType(processed.format);
		}

		// Generate unique filename with correct extension
		const imageId = nanoid();
		const extension = finalMimeType.split('/')[1] || 'jpg';
		const filename = `${imageId}.${extension}`;
		const storagePath = `${galleryId}/${filename}`;

		// Save processed image
		await storage.save(storagePath, processedBuffer);

		// Create database record with location data
		const image: schema.Image = {
			id: imageId,
			galleryId,
			filename,
			originalFilename: file.name,
			mimeType: finalMimeType,
			sizeBytes: finalSize,
			width: finalWidth,
			height: finalHeight,
			storagePath,
			latitude: exifData.latitude ?? null,
			longitude: exifData.longitude ?? null,
			locationName: null,
			altitude: exifData.altitude ?? null,
			takenAt: exifData.takenAt ?? null,
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
	options: ResizeOptions & { format?: string; quality?: number } = {}
): Promise<{ buffer: Buffer; mimeType: string } | null> {
	const image = await getImage(imageId);
	if (!image) return null;

	try {
		const originalBuffer = await storage.read(image.storagePath);

		// Get gallery settings
		const gallery = await db
			.select()
			.from(schema.galleries)
			.where(eq(schema.galleries.id, image.galleryId))
			.get();

		// Check if any processing is needed
		const needsProcessing = options.width || options.height || options.thumb ||
			gallery?.outputFormat || options.format || options.quality ||
			gallery?.jpegQuality || gallery?.webpQuality || gallery?.avifQuality;

		// If no processing needed, return original
		if (!needsProcessing) {
			return { buffer: originalBuffer, mimeType: image.mimeType };
		}

		// Build advanced options from gallery settings
		const galleryOptions = buildAdvancedOptionsFromGallery(gallery ?? null);

		// Merge with request options (request options override)
		const advancedOptions: AdvancedProcessingOptions = {
			...galleryOptions,
			...options,
			// Allow URL params to override format and quality
			outputFormat: options.format as AdvancedProcessingOptions['outputFormat'] ?? galleryOptions.outputFormat,
			jpegQuality: options.quality ?? galleryOptions.jpegQuality,
			webpQuality: options.quality ?? galleryOptions.webpQuality,
			avifQuality: options.quality ?? galleryOptions.avifQuality
		};

		// Process image with advanced options
		const processed = await processImageAdvanced(originalBuffer, advancedOptions, image.mimeType);

		// Determine mime type based on output format
		const mimeType = getMimeType(processed.format);

		return { buffer: processed.buffer, mimeType };
	} catch (e) {
		console.error('Error reading image:', e);
		return null;
	}
}

// Update image metadata (location, etc.)
export async function updateImageMetadata(
	imageId: string,
	data: ImageMetadataUpdate
): Promise<boolean> {
	const updates: Partial<schema.Image> = {};

	if (data.latitude !== undefined) updates.latitude = data.latitude;
	if (data.longitude !== undefined) updates.longitude = data.longitude;
	if (data.locationName !== undefined) updates.locationName = data.locationName;
	if (data.altitude !== undefined) updates.altitude = data.altitude;
	if (data.takenAt !== undefined) updates.takenAt = data.takenAt;

	if (Object.keys(updates).length === 0) return false;

	await db
		.update(schema.images)
		.set(updates)
		.where(eq(schema.images.id, imageId));

	return true;
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
