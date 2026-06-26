CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`thumbnail_hue` integer DEFAULT 217 NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	`opened_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`is_guest` integer DEFAULT false NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);