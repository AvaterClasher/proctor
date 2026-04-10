ALTER TABLE `candidate` ADD `user_id` text REFERENCES user(id);--> statement-breakpoint
CREATE INDEX `candidate_userId_idx` ON `candidate` (`user_id`);