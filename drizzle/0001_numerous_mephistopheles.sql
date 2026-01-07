CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `galleries` ADD `thumb_size` integer;--> statement-breakpoint
ALTER TABLE `galleries` ADD `thumb_quality` integer;--> statement-breakpoint
ALTER TABLE `galleries` ADD `image_quality` integer;