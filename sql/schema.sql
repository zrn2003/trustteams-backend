-- Create database and users table
CREATE DATABASE IF NOT EXISTS `trustteams` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `trustteams`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(191) NULL,
  `role` ENUM('admin', 'manager', 'viewer') NOT NULL DEFAULT 'viewer',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `last_login` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Opportunities table
CREATE TABLE IF NOT EXISTS `opportunities` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL,
  `type` ENUM('internship','job','research','other') NOT NULL DEFAULT 'other',
  `description` TEXT NULL,
  `location` VARCHAR(191) NULL,
  `status` ENUM('open','closed') NOT NULL DEFAULT 'open',
  `closing_date` DATE NULL,
  `posted_by` INT UNSIGNED NULL,
  `deleted_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_closing_date` (`closing_date`),
  KEY `idx_deleted_at` (`deleted_at`),
  FULLTEXT KEY `idx_search` (`title`, `description`, `location`),
  CONSTRAINT `fk_opportunities_user` FOREIGN KEY (`posted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit trail table
CREATE TABLE IF NOT EXISTS `opportunity_audit` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `opportunity_id` INT UNSIGNED NULL,
  `action` VARCHAR(50) NOT NULL,
  `changed_by` INT UNSIGNED NULL,
  `old_values` JSON NULL,
  `new_values` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_opportunity_id` (`opportunity_id`),
  KEY `idx_changed_by` (`changed_by`),
  CONSTRAINT `fk_audit_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


