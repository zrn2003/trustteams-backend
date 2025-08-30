-- Add comprehensive profile detail tables for students and academic leaders
-- This migration adds education, experiences, skills, and projects tables

USE trustteams;

-- Education table
CREATE TABLE IF NOT EXISTS user_education (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  degree VARCHAR(255) NOT NULL,
  institution VARCHAR(255) NOT NULL,
  field_of_study VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  grade VARCHAR(50) NULL,
  description TEXT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_institution (institution),
  INDEX idx_field_of_study (field_of_study)
);

-- Work Experience table
CREATE TABLE IF NOT EXISTS user_experience (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255) NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT NOT NULL,
  achievements TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_company (company),
  INDEX idx_title (title)
);

-- Skills table
CREATE TABLE IF NOT EXISTS user_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  skill_name VARCHAR(255) NOT NULL,
  skill_category ENUM('technical', 'soft', 'language', 'other') DEFAULT 'technical',
  proficiency_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate',
  years_of_experience INT NULL,
  description TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_skill_name (skill_name),
  INDEX idx_category (skill_category),
  INDEX idx_proficiency (proficiency_level)
);

-- Projects table
CREATE TABLE IF NOT EXISTS user_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  project_type ENUM('academic', 'personal', 'professional', 'research', 'other') DEFAULT 'academic',
  description TEXT NOT NULL,
  technologies_used TEXT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  is_current BOOLEAN DEFAULT FALSE,
  project_url VARCHAR(500) NULL,
  github_url VARCHAR(500) NULL,
  achievements TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_project_name (project_name),
  INDEX idx_project_type (project_type)
);

-- Insert sample data for testing
-- Sample education data
INSERT INTO user_education (user_id, degree, institution, field_of_study, start_date, end_date, grade, description, is_current) VALUES
(25, 'Bachelor of Technology', 'SVERI College of Engineering', 'Computer Science', '2021-08-01', '2025-05-01', '8.5 CGPA', 'Focused on software development and web technologies', FALSE),
(25, 'Higher Secondary', 'ABC School', 'Science', '2019-06-01', '2021-05-01', '85%', 'Science stream with Mathematics', FALSE);

-- Sample experience data
INSERT INTO user_experience (user_id, title, company, location, start_date, end_date, is_current, description, achievements) VALUES
(25, 'Student Developer', 'Tech Club', 'Pandharpur', '2023-01-01', NULL, TRUE, 'Working on various web development projects', 'Developed 3 web applications, won coding competition'),
(25, 'Intern', 'Local IT Company', 'Pune', '2023-06-01', '2023-08-01', FALSE, 'Summer internship in web development', 'Completed 2 client projects successfully');

-- Sample skills data
INSERT INTO user_skills (user_id, skill_name, skill_category, proficiency_level, years_of_experience, description) VALUES
(25, 'JavaScript', 'technical', 'advanced', 2, 'Frontend development with React and Node.js'),
(25, 'Python', 'technical', 'intermediate', 1, 'Data analysis and backend development'),
(25, 'React', 'technical', 'advanced', 2, 'Frontend framework development'),
(25, 'Communication', 'soft', 'advanced', 3, 'Team collaboration and presentation skills'),
(25, 'English', 'language', 'advanced', 5, 'Fluent in written and spoken English'),
(25, 'Hindi', 'language', 'expert', 10, 'Native language');

-- Sample projects data
INSERT INTO user_projects (user_id, project_name, project_type, description, technologies_used, start_date, end_date, is_current, project_url, github_url, achievements) VALUES
(25, 'E-Learning Platform', 'academic', 'A comprehensive online learning management system', 'React, Node.js, MongoDB, Express', '2023-09-01', '2024-01-01', FALSE, 'https://elearning-demo.com', 'https://github.com/user/elearning', 'Won best project award'),
(25, 'Task Management App', 'personal', 'Personal productivity application', 'React, Firebase, Material-UI', '2024-02-01', NULL, TRUE, 'https://taskapp-demo.com', 'https://github.com/user/taskapp', '100+ active users'),
(25, 'Weather Dashboard', 'academic', 'Real-time weather information display', 'JavaScript, HTML, CSS, Weather API', '2023-03-01', '2023-05-01', FALSE, NULL, 'https://github.com/user/weather', 'Featured in college tech fair');
