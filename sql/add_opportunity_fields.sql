-- Add missing fields to opportunities table for academic leader opportunity posting
-- This migration adds fields needed for comprehensive opportunity management

USE trustteams;

-- Add new fields to opportunities table
ALTER TABLE opportunities 
ADD COLUMN requirements TEXT NULL AFTER description,
ADD COLUMN stipend VARCHAR(255) NULL AFTER requirements,
ADD COLUMN duration VARCHAR(255) NULL AFTER stipend,
ADD COLUMN contact_email VARCHAR(255) NULL AFTER duration,
ADD COLUMN contact_phone VARCHAR(50) NULL AFTER contact_email;

-- Update the type enum to include more opportunity types
ALTER TABLE opportunities 
MODIFY COLUMN type ENUM('internship', 'job', 'research', 'research_paper', 'project', 'other') NOT NULL;

-- Add index for new fields
ALTER TABLE opportunities 
ADD INDEX idx_requirements (requirements(100)),
ADD INDEX idx_stipend (stipend),
ADD INDEX idx_duration (duration),
ADD INDEX idx_contact_email (contact_email);

-- Update existing opportunities to have default values
UPDATE opportunities 
SET requirements = 'Not specified',
    stipend = 'Not specified',
    duration = 'Not specified',
    contact_email = 'contact@university.edu',
    contact_phone = 'Not specified'
WHERE requirements IS NULL;

-- Add sample opportunities for testing
INSERT INTO opportunities (
  title, 
  type, 
  description, 
  requirements, 
  stipend, 
  duration, 
  location, 
  status, 
  closing_date, 
  posted_by, 
  contact_email, 
  contact_phone
) VALUES 
(
  'Machine Learning Research Assistant',
  'research_paper',
  'Join our cutting-edge research team working on advanced machine learning algorithms for computer vision applications.',
  'Strong background in Python, TensorFlow/PyTorch, and machine learning fundamentals. Experience with computer vision is a plus.',
  '$800/month',
  '6 months',
  'On-campus',
  'open',
  DATE_ADD(CURDATE(), INTERVAL 30 DAY),
  1,
  'research@university.edu',
  '+1-555-0123'
),
(
  'Web Development Internship',
  'internship',
  'Gain hands-on experience building modern web applications using React, Node.js, and modern development practices.',
  'Basic knowledge of HTML, CSS, JavaScript. Familiarity with React is preferred but not required.',
  '$600/month',
  '3 months',
  'Remote',
  'open',
  DATE_ADD(CURDATE(), INTERVAL 45 DAY),
  1,
  'internships@university.edu',
  '+1-555-0456'
),
(
  'Data Science Project Collaboration',
  'project',
  'Collaborate on a real-world data analysis project involving social media sentiment analysis and trend prediction.',
  'Python programming skills, basic statistics knowledge, and familiarity with pandas/numpy. Experience with NLP is a bonus.',
  'Academic credit + $300 stipend',
  '4 months',
  'Hybrid',
  'open',
  DATE_ADD(CURDATE(), INTERVAL 60 DAY),
  1,
  'datascience@university.edu',
  '+1-555-0789'
);

-- Verify the changes
SELECT 
  id, 
  title, 
  type, 
  requirements, 
  stipend, 
  duration, 
  contact_email, 
  contact_phone,
  created_at
FROM opportunities 
ORDER BY created_at DESC 
LIMIT 5;
