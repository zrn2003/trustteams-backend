-- Add opportunity applications table for tracking student applications
-- This migration creates a comprehensive application system

USE trustteams;

-- Create opportunity applications table
CREATE TABLE opportunity_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  opportunity_id INT NOT NULL,
  student_id INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'withdrawn') DEFAULT 'pending',
  application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  review_notes TEXT NULL,
  cover_letter TEXT NULL,
  resume_url VARCHAR(500) NULL,
  portfolio_url VARCHAR(500) NULL,
  gpa DECIMAL(3,2) NULL,
  expected_graduation DATE NULL,
  relevant_courses TEXT NULL,
  skills TEXT NULL,
  experience_summary TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  
  UNIQUE KEY unique_application (opportunity_id, student_id),
  INDEX idx_opportunity_id (opportunity_id),
  INDEX idx_student_id (student_id),
  INDEX idx_status (status),
  INDEX idx_application_date (application_date),
  INDEX idx_reviewed_by (reviewed_by)
);

-- Add sample applications for testing
INSERT INTO opportunity_applications (
  opportunity_id,
  student_id,
  status,
  cover_letter,
  gpa,
  expected_graduation,
  relevant_courses,
  skills,
  experience_summary
) VALUES 
(
  1, -- Machine Learning Research Assistant opportunity
  2, -- Assuming student ID 2 exists
  'pending',
  'I am passionate about machine learning and computer vision. I have completed courses in Python programming, data structures, and introductory machine learning. I am excited to contribute to your research team and learn from experienced researchers.',
  3.8,
  '2025-05-15',
  'CS 101: Introduction to Programming\nCS 201: Data Structures and Algorithms\nCS 301: Machine Learning Fundamentals\nMATH 201: Linear Algebra',
  'Python, TensorFlow, NumPy, Pandas, Scikit-learn, Git',
  'Completed 2 machine learning projects, participated in hackathon, member of CS club'
),
(
  2, -- Web Development Internship opportunity
  3, -- Assuming student ID 3 exists
  'approved',
  'I have been developing web applications for the past year using React and Node.js. I am looking for an internship to gain professional experience and contribute to real-world projects.',
  3.6,
  '2025-12-20',
  'CS 101: Introduction to Programming\nCS 202: Web Development\nCS 303: Database Systems\nCS 304: Software Engineering',
  'React, Node.js, JavaScript, HTML, CSS, MongoDB, Git',
  'Built 3 web applications, freelanced for small businesses, active open source contributor'
),
(
  1, -- Machine Learning Research Assistant opportunity
  4, -- Assuming student ID 4 exists
  'rejected',
  'I am interested in research opportunities and have a strong academic background in mathematics and computer science.',
  3.4,
  '2025-08-10',
  'CS 101: Introduction to Programming\nMATH 201: Linear Algebra\nMATH 202: Calculus II\nSTAT 201: Statistics',
  'Python, MATLAB, R, LaTeX, Git',
  'Research assistant for math department, published 1 paper, teaching assistant for CS 101'
);

-- Add indexes for better performance
CREATE INDEX idx_applications_opportunity_status ON opportunity_applications(opportunity_id, status);
CREATE INDEX idx_applications_student_status ON opportunity_applications(student_id, status);
CREATE INDEX idx_applications_date_range ON opportunity_applications(application_date, status);
