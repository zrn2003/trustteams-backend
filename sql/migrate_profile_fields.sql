-- Migration script to add profile fields to users table
-- Run this script to add the missing fields for profile editing

USE trustteams;

-- Add phone field (will fail if already exists, which is fine)
ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL AFTER institute_name;

-- Add address field
ALTER TABLE users ADD COLUMN address TEXT NULL AFTER phone;

-- Add position field
ALTER TABLE users ADD COLUMN position VARCHAR(255) NULL AFTER address;

-- Add department field
ALTER TABLE users ADD COLUMN department VARCHAR(255) NULL AFTER position;

-- Add bio field
ALTER TABLE users ADD COLUMN bio TEXT NULL AFTER department;

-- Update existing users with default values for new fields
UPDATE users SET 
  phone = NULL,
  address = NULL,
  position = CASE 
    WHEN role = 'university_admin' THEN 'University Administrator'
    WHEN role = 'academic_leader' THEN 'Academic Leader'
    WHEN role = 'student' THEN 'Student'
    ELSE 'User'
  END,
  department = CASE 
    WHEN role = 'university_admin' THEN 'University Administration'
    WHEN role = 'academic_leader' THEN 'Academic Affairs'
    WHEN role = 'student' THEN 'Student Affairs'
    ELSE 'General'
  END,
  bio = NULL
WHERE phone IS NULL OR address IS NULL OR position IS NULL OR department IS NULL OR bio IS NULL;

-- Verify the changes
SELECT id, name, email, role, phone, address, position, department, bio FROM users LIMIT 5;
