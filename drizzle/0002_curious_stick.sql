CREATE TABLE `gallery_collaborators` (
	`id` text PRIMARY KEY NOT NULL,
	`gallery_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`invited_by` text NOT NULL,
	`invited_at` integer NOT NULL,
	`accepted_at` integer,
	FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gallery_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`gallery_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`invited_by` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gallery_invitations_token_unique` ON `gallery_invitations` (`token`);--> statement-breakpoint
CREATE TABLE `image_tag_assignments` (
	`image_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`image_id`, `tag_id`),
	FOREIGN KEY (`image_id`) REFERENCES `images`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `image_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `image_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`gallery_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text,
	FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `galleries` ADD `output_format` text;--> statement-breakpoint
ALTER TABLE `galleries` ADD `resize_method` text;--> statement-breakpoint
ALTER TABLE `galleries` ADD `jpeg_quality` integer;--> statement-breakpoint
ALTER TABLE `galleries` ADD `webp_quality` integer;--> statement-breakpoint
ALTER TABLE `galleries` ADD `avif_quality` integer;--> statement-breakpoint
ALTER TABLE `galleries` ADD `png_compression_level` integer;--> statement-breakpoint
ALTER TABLE `galleries` ADD `effort` integer;--> statement-breakpoint
ALTER TABLE `galleries` ADD `chroma_subsampling` text;--> statement-breakpoint
ALTER TABLE `galleries` ADD `strip_metadata` integer;--> statement-breakpoint
ALTER TABLE `galleries` ADD `auto_orient` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `images` ADD `latitude` real;--> statement-breakpoint
ALTER TABLE `images` ADD `longitude` real;--> statement-breakpoint
ALTER TABLE `images` ADD `location_name` text;--> statement-breakpoint
ALTER TABLE `images` ADD `altitude` real;--> statement-breakpoint
ALTER TABLE `images` ADD `taken_at` integer;