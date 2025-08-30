-- TrustTeams Database Setup Script
-- Run this script to create the database and tables

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS trustteams;
USE trustteams;

-- Universities table
CREATE TABLE IF NOT EXISTS universities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  domain VARCHAR(255) NOT NULL UNIQUE,
  address TEXT,
  website VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  established_year INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_domain (domain),
  INDEX idx_active (is_active)
);

-- Users table (updated to support approval workflow)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'viewer', 'student', 'academic_leader', 'university_admin') DEFAULT 'viewer',
  university_id INT NULL,
  institute_name VARCHAR(255) NULL,
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approved_by INT NULL,
  approved_at DATETIME NULL,
  rejection_reason TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_university_id (university_id),
  INDEX idx_approval_status (approval_status),
  INDEX idx_active (is_active)
);

-- Opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type ENUM('internship', 'job', 'research', 'other') NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  status ENUM('open', 'closed') DEFAULT 'open',
  closing_date DATE NULL,
  posted_by INT NOT NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_location (location),
  INDEX idx_closing_date (closing_date),
  INDEX idx_posted_by (posted_by),
  INDEX idx_deleted_at (deleted_at),
  FULLTEXT KEY ft_search (title, description)
);

-- Opportunity audit trail table
CREATE TABLE IF NOT EXISTS opportunity_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  opportunity_id INT NOT NULL,
  action ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
  changed_by INT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_opportunity_id (opportunity_id),
  INDEX idx_action (action),
  INDEX idx_changed_by (changed_by),
  INDEX idx_created_at (created_at)
);

-- Registration requests table (for tracking pending approvals)
CREATE TABLE IF NOT EXISTS registration_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  university_id INT NOT NULL,
  institute_name VARCHAR(255) NOT NULL,
  role ENUM('student', 'academic_leader') NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approved_by INT NULL,
  approved_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_university_id (university_id),
  INDEX idx_status (status),
  INDEX idx_role (role)
);

-- Insert sample universities
INSERT IGNORE INTO universities (name, domain, address, website, contact_email, contact_phone, established_year, is_active) VALUES
('Massachusetts Institute of Technology', 'mit.edu', '77 Massachusetts Ave, Cambridge, MA 02139', 'https://mit.edu', 'admissions@mit.edu', '+1-617-253-1000', 1861, true),
('Stanford University', 'stanford.edu', '450 Serra Mall, Stanford, CA 94305', 'https://stanford.edu', 'admissions@stanford.edu', '+1-650-723-2300', 1885, true),
('Harvard University', 'harvard.edu', 'Cambridge, MA 02138', 'https://harvard.edu', 'admissions@harvard.edu', '+1-617-495-1000', 1636, true),
('University of California, Berkeley', 'berkeley.edu', 'Berkeley, CA 94720', 'https://berkeley.edu', 'admissions@berkeley.edu', '+1-510-642-6000', 1868, true),
('Carnegie Mellon University', 'cmu.edu', '5000 Forbes Ave, Pittsburgh, PA 15213', 'https://cmu.edu', 'admissions@cmu.edu', '+1-412-268-2000', 1900, true),
('University of Michigan', 'umich.edu', 'Ann Arbor, MI 48109', 'https://umich.edu', 'admissions@umich.edu', '+1-734-764-1817', 1817, true),
('Georgia Institute of Technology', 'gatech.edu', 'Atlanta, GA 30332', 'https://gatech.edu', 'admissions@gatech.edu', '+1-404-894-2000', 1885, true),
('University of Illinois at Urbana-Champaign', 'illinois.edu', 'Urbana, IL 61801', 'https://illinois.edu', 'admissions@illinois.edu', '+1-217-333-1000', 1867, true),
('University of Texas at Austin', 'utexas.edu', 'Austin, TX 78712', 'https://utexas.edu', 'admissions@utexas.edu', '+1-512-471-3434', 1883, true),
('Purdue University', 'purdue.edu', 'West Lafayette, IN 47907', 'https://purdue.edu', 'admissions@purdue.edu', '+1-765-494-4600', 1869, true);

-- Insert default admin users (auto-approved)
INSERT IGNORE INTO users (name, email, password, role, approval_status, is_active, created_at) VALUES
('System Administrator', 'admin@trustteams.com', 'admin123', 'admin', 'approved', true, NOW()),
('ICM Manager', 'manager@trustteams.com', 'manager123', 'manager', 'approved', true, NOW()),
('ICM Viewer', 'viewer@trustteams.com', 'viewer123', 'viewer', 'approved', true, NOW());

-- Insert a sample university admin (for testing)
INSERT IGNORE INTO users (name, email, password, role, university_id, approval_status, is_active, created_at) VALUES
('MIT Admin', 'admin@mit.edu', 'mitadmin123', 'university_admin', 1, 'approved', true, NOW());

SELECT 'Database setup completed successfully!' as status;
