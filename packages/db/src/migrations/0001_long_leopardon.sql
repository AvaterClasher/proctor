CREATE TABLE `assessment` (
	`id` text PRIMARY KEY NOT NULL,
	`interview_id` text NOT NULL,
	`overall_score` integer NOT NULL,
	`recommendation` text NOT NULL,
	`summary` text NOT NULL,
	`dimensions` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`interview_id`) REFERENCES `interview`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_interview_id_unique` ON `assessment` (`interview_id`);--> statement-breakpoint
CREATE INDEX `assessment_interviewId_idx` ON `assessment` (`interview_id`);--> statement-breakpoint
CREATE TABLE `candidate` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `candidate_email_unique` ON `candidate` (`email`);--> statement-breakpoint
CREATE TABLE `interview` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`livekit_room` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`started_at` integer,
	`ended_at` integer,
	`duration_secs` integer,
	`transcript` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `interview_candidateId_idx` ON `interview` (`candidate_id`);