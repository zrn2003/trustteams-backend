-- Add ICM role to users table
-- This migration adds the 'icm' role to the users.role ENUM

-- First, check if the role already exists
SELECT COUNT(*) as role_exists FROM users WHERE role = 'icm';

-- Add the ICM role to the ENUM if it doesn't exist
ALTER TABLE users MODIFY role ENUM('admin', 'manager', 'viewer', 'student', 'academic_leader', 'university_admin', 'icm') DEFAULT 'viewer';

-- Update any existing users with 'icm' role if they exist
-- (This is a safety check in case the role was added manually before)

-- Verify the change
SHOW COLUMNS FROM users LIKE 'role';
