-- Add comprehensive academic profile fields for academic leaders
-- This migration adds education, research, and project fields to the users table

USE trustteams;

-- Add new academic profile fields to users table
ALTER TABLE users ADD COLUMN years_experience INT NULL;
ALTER TABLE users ADD COLUMN highest_degree VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN field_of_study VARCHAR(200) NULL;
ALTER TABLE users ADD COLUMN institution VARCHAR(200) NULL;
ALTER TABLE users ADD COLUMN completion_year INT NULL;
ALTER TABLE users ADD COLUMN research_papers INT DEFAULT 0;
ALTER TABLE users ADD COLUMN research_areas TEXT NULL;
ALTER TABLE users ADD COLUMN publications TEXT NULL;
ALTER TABLE users ADD COLUMN projects_completed INT DEFAULT 0;
ALTER TABLE users ADD COLUMN current_projects TEXT NULL;
ALTER TABLE users ADD COLUMN project_experience TEXT NULL;

-- Add sample data for academic leader (tarun@gmail.com)
UPDATE users SET 
  years_experience = 8,
  highest_degree = 'Ph.D.',
  field_of_study = 'Computer Science',
  institution = 'IIT Delhi',
  completion_year = 2018,
  research_papers = 15,
  research_areas = 'Machine Learning, Data Science, Artificial Intelligence, IoT',
  publications = '1. "Deep Learning Applications in IoT" - IEEE Transactions (2023)\n2. "Machine Learning for Smart Cities" - ACM Digital Library (2022)\n3. "Data Science in Education" - Springer Journal (2021)',
  projects_completed = 12,
  current_projects = '1. AI-powered Student Assessment System\n2. Smart Campus Management Platform\n3. Research on Educational Technology',
  project_experience = 'Led multiple research projects in collaboration with industry partners. Specialized in developing AI solutions for educational institutions. Successfully completed projects worth over 50 lakhs INR.',
  position = 'Associate Professor',
  department = 'Computer Science & Engineering'
WHERE email = 'tarun@gmail.com';

-- Add sample data for other academic leaders
UPDATE users SET 
  years_experience = 12,
  highest_degree = 'Ph.D.',
  field_of_study = 'Electronics Engineering',
  institution = 'IIT Bombay',
  completion_year = 2015,
  research_papers = 22,
  research_areas = 'VLSI Design, Embedded Systems, Digital Electronics',
  publications = '1. "VLSI Design for IoT Applications" - IEEE Journal (2023)\n2. "Embedded Systems in Automotive" - Elsevier (2022)',
  projects_completed = 18,
  current_projects = '1. Smart Vehicle Monitoring System\n2. IoT-based Industrial Automation',
  project_experience = 'Extensive experience in VLSI design and embedded systems. Collaborated with automotive industry for smart vehicle solutions.',
  position = 'Professor',
  department = 'Electronics & Communication'
WHERE role = 'academic_leader' AND email != 'tarun@gmail.com';

-- Update position and department for academic leaders who don't have them
UPDATE users SET 
  position = 'Assistant Professor',
  department = 'Computer Science'
WHERE role = 'academic_leader' AND position IS NULL;

COMMIT;
