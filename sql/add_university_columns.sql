-- Add university-related columns to users table
-- This script adds the missing columns that the backend expects

USE trustteams;

-- Add university_id column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS university_id INT NULL,
ADD COLUMN IF NOT EXISTS institute_name VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS email_verification_expires DATETIME NULL;

-- Add index on university_id for better performance
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_university_id (university_id);

-- Add foreign key constraint if universities table exists
-- ALTER TABLE users 
-- ADD CONSTRAINT fk_users_university 
-- FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL;

-- Show the updated table structure
DESCRIBE users;
