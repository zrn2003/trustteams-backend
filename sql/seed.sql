USE `trustteams`;

-- Create admin user (Password: admin123)
INSERT INTO `users` (`email`, `password_hash`, `name`, `role`)
VALUES
  ('admin@trustteams.com', 'admin123', 'System Administrator', 'admin')
ON DUPLICATE KEY UPDATE `email`=VALUES(`email`), `password_hash`=VALUES(`password_hash`), `name`=VALUES(`name`), `role`=VALUES(`role`);

-- Create manager user (Password: manager123)
INSERT INTO `users` (`email`, `password_hash`, `name`, `role`)
VALUES
  ('manager@trustteams.com', 'manager123', 'Opportunity Manager', 'manager')
ON DUPLICATE KEY UPDATE `email`=VALUES(`email`), `password_hash`=VALUES(`password_hash`), `name`=VALUES(`name`), `role`=VALUES(`role`);

-- Create viewer user (Password: viewer123)
INSERT INTO `users` (`email`, `password_hash`, `name`, `role`)
VALUES
  ('viewer@trustteams.com', 'viewer123', 'Read Only User', 'viewer')
ON DUPLICATE KEY UPDATE `email`=VALUES(`email`), `password_hash`=VALUES(`password_hash`), `name`=VALUES(`name`), `role`=VALUES(`role`);

-- Sample opportunities
INSERT INTO `opportunities` (`title`, `type`, `description`, `location`, `status`, `closing_date`, `posted_by`)
VALUES
  ('Software Engineering Internship', 'internship', 'Join our dynamic team for a summer internship in software development. Work on real projects and learn from experienced developers.', 'San Francisco, CA', 'open', DATE_ADD(CURDATE(), INTERVAL 30 DAY), 1),
  ('Data Science Research Position', 'research', 'Research position focusing on machine learning and data analysis. Collaborate with leading researchers in the field.', 'Remote', 'open', DATE_ADD(CURDATE(), INTERVAL 45 DAY), 2),
  ('Product Manager Role', 'job', 'Experienced product manager needed to lead our product development team. Must have 3+ years of experience.', 'New York, NY', 'open', DATE_ADD(CURDATE(), INTERVAL 60 DAY), 1),
  ('UX Design Internship', 'internship', 'Learn user experience design principles and work on real client projects. Perfect for design students.', 'Austin, TX', 'closed', DATE_SUB(CURDATE(), INTERVAL 10 DAY), 2)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);


