CREATE TABLE `reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`court_id` integer NOT NULL,
	`date` text NOT NULL,
	`start_hour` integer NOT NULL,
	`end_hour` integer NOT NULL,
	`party_size` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`created_by` integer NOT NULL,
	`cancelled_at` integer,
	`cancelled_by` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cancelled_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_reservations_active_slot` ON `reservations` (`court_id`,`date`,`start_hour`) WHERE "reservations"."status" = 'active';--> statement-breakpoint
CREATE INDEX `idx_reservations_date` ON `reservations` (`date`);--> statement-breakpoint
CREATE INDEX `idx_reservations_user` ON `reservations` (`user_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` integer,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dong` text,
	`ho` text,
	`email` text,
	`name` text NOT NULL,
	`phone` text,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`must_change_password` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`approved_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_users_dong_ho` ON `users` (`dong`,`ho`) WHERE "users"."dong" IS NOT NULL AND "users"."ho" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_users_email` ON `users` (`email`) WHERE "users"."email" IS NOT NULL;