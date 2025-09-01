-- Migration: Add email verification columns to users table
-- Run this script to add email verification functionality

ALTER TABLE users
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE AFTER email,
ADD COLUMN email_verification_token VARCHAR(255) NULL AFTER email_verified,
ADD COLUMN email_verification_expires DATETIME NULL AFTER email_verification_token;

-- Add index for faster token lookups
ALTER TABLE users ADD INDEX idx_email_verification_token (email_verification_token);

-- Set existing users as verified (for backward compatibility)
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;
