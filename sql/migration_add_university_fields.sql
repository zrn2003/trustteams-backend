-- Migration: Add new fields to universities table
-- Run this script to add new university profile fields

ALTER TABLE universities
ADD COLUMN accreditation_status ENUM('accredited', 'pending', 'not_accredited') DEFAULT 'pending' AFTER established_year,
ADD COLUMN student_capacity INT NULL AFTER accreditation_status,
ADD COLUMN program_types TEXT NULL AFTER student_capacity;

-- Add index for accreditation status
ALTER TABLE universities ADD INDEX idx_accreditation_status (accreditation_status);
