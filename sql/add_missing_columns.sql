-- Add missing university columns to users table
USE trustteams;

-- Add university_id column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS university_id INT NULL;

-- Add institute_name column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS institute_name VARCHAR(255) NULL;

-- Add index on university_id for better performance
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_university_id (university_id);

-- Show the updated table structure
DESCRIBE users;
