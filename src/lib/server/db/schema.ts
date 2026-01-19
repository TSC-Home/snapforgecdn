import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
	maxGalleries: integer('max_galleries').notNull().default(10),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Galleries table
export const galleries = sqliteTable('galleries', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	accessToken: text('access_token').notNull().unique(),
	// Compression settings (null = use system defaults)
	thumbSize: integer('thumb_size'),
	thumbQuality: integer('thumb_quality'),
	imageQuality: integer('image_quality'),
	// Advanced image processing settings
	outputFormat: text('output_format', { enum: ['original', 'jpeg', 'webp', 'avif', 'png'] }),
	resizeMethod: text('resize_method', { enum: ['lanczos3', 'lanczos2', 'mitchell', 'catrom', 'nearest'] }),
	jpegQuality: integer('jpeg_quality'),
	webpQuality: integer('webp_quality'),
	avifQuality: integer('avif_quality'),
	pngCompressionLevel: integer('png_compression_level'),
	effort: integer('effort'),
	chromaSubsampling: text('chroma_subsampling', { enum: ['420', '422', '444'] }),
	stripMetadata: integer('strip_metadata', { mode: 'boolean' }),
	autoOrient: integer('auto_orient', { mode: 'boolean' }).default(true),
	// Video processing settings
	videoEnabled: integer('video_enabled', { mode: 'boolean' }).default(true),
	videoMaxSize: integer('video_max_size'), // Max upload size in bytes
	videoMaxDuration: integer('video_max_duration'), // Max duration in seconds
	videoOutputFormat: text('video_output_format', { enum: ['original', 'mp4', 'webm'] }),
	videoCodec: text('video_codec', { enum: ['h264', 'h265', 'vp9', 'av1'] }),
	videoQuality: integer('video_quality'), // CRF value (0-51, lower = better)
	videoMaxWidth: integer('video_max_width'),
	videoMaxHeight: integer('video_max_height'),
	videoAudioCodec: text('video_audio_codec', { enum: ['aac', 'opus', 'copy', 'none'] }),
	videoAudioBitrate: integer('video_audio_bitrate'), // kbps
	videoGenerateThumbnail: integer('video_generate_thumbnail', { mode: 'boolean' }).default(true),
	videoThumbnailTime: integer('video_thumbnail_time'), // Seconds into video for thumbnail
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Images table
export const images = sqliteTable('images', {
	id: text('id').primaryKey(),
	galleryId: text('gallery_id').notNull().references(() => galleries.id, { onDelete: 'cascade' }),
	filename: text('filename').notNull(),
	originalFilename: text('original_filename').notNull(),
	mimeType: text('mime_type').notNull(),
	sizeBytes: integer('size_bytes').notNull(),
	width: integer('width').notNull(),
	height: integer('height').notNull(),
	storagePath: text('storage_path').notNull(),
	// Location metadata
	latitude: real('latitude'),
	longitude: real('longitude'),
	locationName: text('location_name'),
	altitude: real('altitude'),
	takenAt: integer('taken_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Videos table
export const videos = sqliteTable('videos', {
	id: text('id').primaryKey(),
	galleryId: text('gallery_id').notNull().references(() => galleries.id, { onDelete: 'cascade' }),
	filename: text('filename').notNull(),
	originalFilename: text('original_filename').notNull(),
	mimeType: text('mime_type').notNull(),
	sizeBytes: integer('size_bytes').notNull(),
	width: integer('width'),
	height: integer('height'),
	duration: real('duration'), // Duration in seconds
	storagePath: text('storage_path').notNull(),
	thumbnailPath: text('thumbnail_path'), // Generated thumbnail
	// Processed versions
	processedPath: text('processed_path'), // Transcoded version
	processingStatus: text('processing_status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
	processingError: text('processing_error'),
	// Location metadata
	latitude: real('latitude'),
	longitude: real('longitude'),
	locationName: text('location_name'),
	takenAt: integer('taken_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Settings table (key-value store)
export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value', { mode: 'json' }).notNull()
});

// Sessions table
export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

// Gallery collaborators table
export const galleryCollaborators = sqliteTable('gallery_collaborators', {
	id: text('id').primaryKey(),
	galleryId: text('gallery_id').notNull().references(() => galleries.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	role: text('role', { enum: ['viewer', 'editor', 'manager'] }).notNull().default('viewer'),
	invitedBy: text('invited_by').notNull().references(() => users.id),
	invitedAt: integer('invited_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
	acceptedAt: integer('accepted_at', { mode: 'timestamp' })
});

// Gallery invitations table (pending invitations)
export const galleryInvitations = sqliteTable('gallery_invitations', {
	id: text('id').primaryKey(),
	galleryId: text('gallery_id').notNull().references(() => galleries.id, { onDelete: 'cascade' }),
	email: text('email').notNull(),
	role: text('role', { enum: ['viewer', 'editor', 'manager'] }).notNull().default('viewer'),
	invitedBy: text('invited_by').notNull().references(() => users.id),
	token: text('token').notNull().unique(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Image tags table
export const imageTags = sqliteTable('image_tags', {
	id: text('id').primaryKey(),
	galleryId: text('gallery_id').notNull().references(() => galleries.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	color: text('color')
});

// Image tag assignments (junction table)
export const imageTagAssignments = sqliteTable('image_tag_assignments', {
	imageId: text('image_id').notNull().references(() => images.id, { onDelete: 'cascade' }),
	tagId: text('tag_id').notNull().references(() => imageTags.id, { onDelete: 'cascade' })
}, (table) => [
	primaryKey({ columns: [table.imageId, table.tagId] })
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
	galleries: many(galleries),
	sessions: many(sessions),
	collaborations: many(galleryCollaborators),
	invitedCollaborators: many(galleryCollaborators, { relationName: 'inviter' })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	})
}));

export const galleriesRelations = relations(galleries, ({ one, many }) => ({
	user: one(users, {
		fields: [galleries.userId],
		references: [users.id]
	}),
	images: many(images),
	videos: many(videos),
	collaborators: many(galleryCollaborators),
	invitations: many(galleryInvitations),
	tags: many(imageTags)
}));

export const imagesRelations = relations(images, ({ one, many }) => ({
	gallery: one(galleries, {
		fields: [images.galleryId],
		references: [galleries.id]
	}),
	tagAssignments: many(imageTagAssignments)
}));

export const videosRelations = relations(videos, ({ one }) => ({
	gallery: one(galleries, {
		fields: [videos.galleryId],
		references: [galleries.id]
	})
}));

export const galleryCollaboratorsRelations = relations(galleryCollaborators, ({ one }) => ({
	gallery: one(galleries, {
		fields: [galleryCollaborators.galleryId],
		references: [galleries.id]
	}),
	user: one(users, {
		fields: [galleryCollaborators.userId],
		references: [users.id]
	}),
	inviter: one(users, {
		fields: [galleryCollaborators.invitedBy],
		references: [users.id],
		relationName: 'inviter'
	})
}));

export const galleryInvitationsRelations = relations(galleryInvitations, ({ one }) => ({
	gallery: one(galleries, {
		fields: [galleryInvitations.galleryId],
		references: [galleries.id]
	}),
	inviter: one(users, {
		fields: [galleryInvitations.invitedBy],
		references: [users.id]
	})
}));

export const imageTagsRelations = relations(imageTags, ({ one, many }) => ({
	gallery: one(galleries, {
		fields: [imageTags.galleryId],
		references: [galleries.id]
	}),
	assignments: many(imageTagAssignments)
}));

export const imageTagAssignmentsRelations = relations(imageTagAssignments, ({ one }) => ({
	image: one(images, {
		fields: [imageTagAssignments.imageId],
		references: [images.id]
	}),
	tag: one(imageTags, {
		fields: [imageTagAssignments.tagId],
		references: [imageTags.id]
	})
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Gallery = typeof galleries.$inferSelect;
export type NewGallery = typeof galleries.$inferInsert;
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type GalleryCollaborator = typeof galleryCollaborators.$inferSelect;
export type NewGalleryCollaborator = typeof galleryCollaborators.$inferInsert;
export type GalleryInvitation = typeof galleryInvitations.$inferSelect;
export type NewGalleryInvitation = typeof galleryInvitations.$inferInsert;
export type ImageTag = typeof imageTags.$inferSelect;
export type NewImageTag = typeof imageTags.$inferInsert;
export type ImageTagAssignment = typeof imageTagAssignments.$inferSelect;
export type NewImageTagAssignment = typeof imageTagAssignments.$inferInsert;

// Role type for collaborators
export type CollaboratorRole = 'viewer' | 'editor' | 'manager';
