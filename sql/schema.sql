-- TrustTeams Database Schema
-- This file creates the database structure for the TrustTeams collaboration platform

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS defaultdb;
USE defaultdb;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL, -- Plaintext as requested
  role ENUM('admin', 'manager', 'viewer') DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT TRUE,
  last_login DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
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


