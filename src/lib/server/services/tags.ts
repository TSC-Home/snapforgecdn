import { db, schema } from '../db';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { ImageTag, NewImageTag } from '../db/schema';

export interface TagWithCount extends ImageTag {
	imageCount: number;
}

// Create a new tag for a gallery
export async function createTag(
	galleryId: string,
	name: string,
	color?: string
): Promise<ImageTag> {
	const id = nanoid();
	const tag: NewImageTag = {
		id,
		galleryId,
		name: name.trim(),
		color: color || null
	};

	await db.insert(schema.imageTags).values(tag);
	return { ...tag, color: tag.color ?? null } as ImageTag;
}

// Get all tags for a gallery
export async function getGalleryTags(galleryId: string): Promise<ImageTag[]> {
	return await db
		.select()
		.from(schema.imageTags)
		.where(eq(schema.imageTags.galleryId, galleryId));
}

// Get all tags for a gallery with image counts
export async function getGalleryTagsWithCounts(galleryId: string): Promise<TagWithCount[]> {
	const tags = await getGalleryTags(galleryId);

	// Get counts for each tag
	const tagsWithCounts = await Promise.all(
		tags.map(async (tag) => {
			const assignments = await db
				.select()
				.from(schema.imageTagAssignments)
				.where(eq(schema.imageTagAssignments.tagId, tag.id));
			return {
				...tag,
				imageCount: assignments.length
			};
		})
	);

	return tagsWithCounts;
}

// Get a single tag by ID
export async function getTag(tagId: string): Promise<ImageTag | null> {
	const tag = await db
		.select()
		.from(schema.imageTags)
		.where(eq(schema.imageTags.id, tagId))
		.get();
	return tag ?? null;
}

// Update a tag
export async function updateTag(
	tagId: string,
	data: { name?: string; color?: string | null }
): Promise<boolean> {
	const updates: Partial<ImageTag> = {};
	if (data.name !== undefined) updates.name = data.name.trim();
	if (data.color !== undefined) updates.color = data.color;

	if (Object.keys(updates).length === 0) return false;

	// Check if tag exists first
	const existing = await getTag(tagId);
	if (!existing) return false;

	await db
		.update(schema.imageTags)
		.set(updates)
		.where(eq(schema.imageTags.id, tagId));

	return true;
}

// Delete a tag (also removes all assignments)
export async function deleteTag(tagId: string): Promise<boolean> {
	// Check if tag exists first
	const existing = await getTag(tagId);
	if (!existing) return false;

	await db
		.delete(schema.imageTags)
		.where(eq(schema.imageTags.id, tagId));

	return true;
}

// Assign a tag to an image
export async function assignTagToImage(imageId: string, tagId: string): Promise<boolean> {
	try {
		await db
			.insert(schema.imageTagAssignments)
			.values({ imageId, tagId })
			.onConflictDoNothing();
		return true;
	} catch {
		return false;
	}
}

// Remove a tag from an image
export async function removeTagFromImage(imageId: string, tagId: string): Promise<boolean> {
	// Check if assignment exists
	const existing = await db
		.select()
		.from(schema.imageTagAssignments)
		.where(
			and(
				eq(schema.imageTagAssignments.imageId, imageId),
				eq(schema.imageTagAssignments.tagId, tagId)
			)
		)
		.get();

	if (!existing) return false;

	await db
		.delete(schema.imageTagAssignments)
		.where(
			and(
				eq(schema.imageTagAssignments.imageId, imageId),
				eq(schema.imageTagAssignments.tagId, tagId)
			)
		);

	return true;
}

// Get all tags for an image
export async function getImageTags(imageId: string): Promise<ImageTag[]> {
	const assignments = await db
		.select({
			tag: schema.imageTags
		})
		.from(schema.imageTagAssignments)
		.innerJoin(schema.imageTags, eq(schema.imageTagAssignments.tagId, schema.imageTags.id))
		.where(eq(schema.imageTagAssignments.imageId, imageId));

	return assignments.map(a => a.tag);
}

// Set all tags for an image (replaces existing)
export async function setImageTags(imageId: string, tagIds: string[]): Promise<boolean> {
	// Remove all existing assignments
	await db
		.delete(schema.imageTagAssignments)
		.where(eq(schema.imageTagAssignments.imageId, imageId));

	// Add new assignments
	if (tagIds.length > 0) {
		await db
			.insert(schema.imageTagAssignments)
			.values(tagIds.map(tagId => ({ imageId, tagId })));
	}

	return true;
}

// Get all images with a specific tag
export async function getImageIdsByTag(tagId: string): Promise<string[]> {
	const assignments = await db
		.select({ imageId: schema.imageTagAssignments.imageId })
		.from(schema.imageTagAssignments)
		.where(eq(schema.imageTagAssignments.tagId, tagId));

	return assignments.map(a => a.imageId);
}

// Check if a tag name already exists in a gallery
export async function tagExistsInGallery(galleryId: string, name: string): Promise<boolean> {
	const normalizedName = name.trim().toLowerCase();
	const tags = await getGalleryTags(galleryId);
	return tags.some(tag => tag.name.toLowerCase() === normalizedName);
}
