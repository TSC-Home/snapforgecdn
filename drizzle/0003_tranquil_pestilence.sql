CREATE TABLE `videos` (
	`id` text PRIMARY KEY NOT NULL,
	`gallery_id` text NOT NULL,
	`filename` text NOT NULL,
	`original_filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`duration` real,
	`storage_path` text NOT NULL,
	`thumbnail_path` text,
	`processed_path` text,
	`processing_status` text DEFAULT 'pending',
	`processing_error` text,
	`latitude` real,
	`longitude` real,
	`location_name` text,
	`taken_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `galleries` ADD `video_enabled` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `galleries` ADD `video_max_size` integer;--> statement-breakpoint
ALTER TABLE `galleries` ADD `video_max_duration` integer;--> statement-breakpoint
ALTER TABLE `galleries` ADD `video_output_format` text;--> statement-breakpoint
ALTER TABLE `galleries` ADD `video_codec` text;--> statement-breakpoint
ALTER TABLE `galleries` ADD `video_quality` integer;--> statement-breakpoint
ALTER TABLE `galleries` ADD `video_max_width` integer;--> statement-breakpoint
ALTER TABLE `galleries` ADD `video_max_height` integer;--> statement-breakpoint
ALTER TABLE `galleries` ADD `video_audio_codec` text;--> statement-breakpoint
ALTER TABLE `galleries` ADD `video_audio_bitrate` integer;--> statement-breakpoint
ALTER TABLE `galleries` ADD `video_generate_thumbnail` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `galleries` ADD `video_thumbnail_time` integer;