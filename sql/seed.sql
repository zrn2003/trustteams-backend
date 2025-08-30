-- TrustTeams Database Seed Data
-- This file populates the database with initial data

USE trustteams;

-- Insert sample universities
INSERT INTO universities (name, domain, address, website, contact_email, contact_phone, established_year) VALUES
('Massachusetts Institute of Technology', 'mit.edu', '77 Massachusetts Ave, Cambridge, MA 02139', 'https://mit.edu', 'admissions@mit.edu', '+1-617-253-1000', 1861),
('Stanford University', 'stanford.edu', '450 Serra Mall, Stanford, CA 94305', 'https://stanford.edu', 'admissions@stanford.edu', '+1-650-723-2300', 1885),
('Harvard University', 'harvard.edu', 'Cambridge, MA 02138', 'https://harvard.edu', 'admissions@harvard.edu', '+1-617-495-1000', 1636),
('University of California, Berkeley', 'berkeley.edu', 'Berkeley, CA 94720', 'https://berkeley.edu', 'admissions@berkeley.edu', '+1-510-642-6000', 1868),
('Carnegie Mellon University', 'cmu.edu', '5000 Forbes Ave, Pittsburgh, PA 15213', 'https://cmu.edu', 'admissions@cmu.edu', '+1-412-268-2000', 1900),
('University of Michigan', 'umich.edu', 'Ann Arbor, MI 48109', 'https://umich.edu', 'admissions@umich.edu', '+1-734-764-1817', 1817),
('Georgia Institute of Technology', 'gatech.edu', 'North Ave NW, Atlanta, GA 30332', 'https://gatech.edu', 'admissions@gatech.edu', '+1-404-894-2000', 1885),
('University of Illinois Urbana-Champaign', 'illinois.edu', 'Champaign, IL 61820', 'https://illinois.edu', 'admissions@illinois.edu', '+1-217-333-1000', 1867),
('University of Texas at Austin', 'utexas.edu', 'Austin, TX 78712', 'https://utexas.edu', 'admissions@utexas.edu', '+1-512-471-3434', 1883),
('Purdue University', 'purdue.edu', 'West Lafayette, IN 47907', 'https://purdue.edu', 'admissions@purdue.edu', '+1-765-494-4600', 1869);

-- Insert default admin user (if not exists)
INSERT IGNORE INTO users (name, email, password, role, approval_status, is_active) VALUES
('System Administrator', 'admin@trustteams.com', 'admin123', 'admin', 'approved', true),
('Demo Manager', 'manager@trustteams.com', 'manager123', 'manager', 'approved', true),
('Demo Viewer', 'viewer@trustteams.com', 'viewer123', 'viewer', 'approved', true);

-- Insert initial users (plaintext passwords as requested)
INSERT INTO users (name, email, password, role, is_active, created_at) VALUES
('Admin User', 'admin@trustteams.com', 'admin123', 'admin', true, NOW()),
('Manager User', 'manager@trustteams.com', 'manager123', 'manager', true, NOW()),
('Viewer User', 'viewer@trustteams.com', 'viewer123', 'viewer', true, NOW()),
('John Doe', 'john@example.com', 'password123', 'viewer', true, NOW()),
('Jane Smith', 'jane@example.com', 'password123', 'manager', true, NOW());

-- Insert university admin users
INSERT INTO users (name, email, password, role, university_id, approval_status, is_active, created_at) VALUES
('MIT Admin', 'admin@mit.edu', 'admin123', 'university_admin', 1, 'approved', true, NOW()),
('Stanford Admin', 'admin@stanford.edu', 'admin123', 'university_admin', 2, 'approved', true, NOW()),
('Harvard Admin', 'admin@harvard.edu', 'admin123', 'university_admin', 3, 'approved', true, NOW());

-- Insert sample students and academic leaders
INSERT INTO users (name, email, password, role, university_id, approval_status, is_active, created_at) VALUES
('Alice Johnson', 'alice@mit.edu', 'password123', 'student', 1, 'approved', true, NOW()),
('Bob Wilson', 'bob@mit.edu', 'password123', 'student', 1, 'approved', true, NOW()),
('Carol Davis', 'carol@mit.edu', 'password123', 'academic_leader', 1, 'approved', true, NOW()),
('David Brown', 'david@stanford.edu', 'password123', 'student', 2, 'approved', true, NOW()),
('Eva Garcia', 'eva@stanford.edu', 'password123', 'academic_leader', 2, 'approved', true, NOW()),
('Frank Miller', 'frank@harvard.edu', 'password123', 'student', 3, 'approved', true, NOW());

-- Insert sample registration requests
INSERT INTO registration_requests (user_id, university_id, institute_name, role, status, created_at) VALUES
(4, 1, 'MIT Computer Science', 'student', 'pending', NOW()),
(5, 1, 'MIT Engineering', 'academic_leader', 'pending', NOW()),
(6, 2, 'Stanford Business School', 'student', 'pending', NOW()),
(7, 2, 'Stanford Medical School', 'academic_leader', 'pending', NOW()),
(8, 3, 'Harvard Law School', 'student', 'pending', NOW());

-- Insert sample opportunities
INSERT INTO opportunities (title, type, description, location, status, closing_date, posted_by, created_at, updated_at) VALUES
('Software Engineering Internship', 'internship', 'Join our dynamic team for a 3-month internship in software development. Work on real projects using React, Node.js, and MySQL. Perfect for students looking to gain hands-on experience.', 'New York, NY', 'open', '2024-12-31', 1, NOW(), NOW()),
('Data Science Research Position', 'research', 'We are seeking a data scientist to join our research team. Focus on machine learning algorithms and big data analysis. PhD preferred but not required.', 'San Francisco, CA', 'open', '2024-11-30', 2, NOW(), NOW()),
('Frontend Developer Job', 'job', 'Experienced frontend developer needed for a fast-growing startup. Must be proficient in React, TypeScript, and modern CSS. Remote work available.', 'Remote', 'open', '2024-10-31', 1, NOW(), NOW()),
('UX/UI Design Collaboration', 'other', 'Looking for a creative UX/UI designer to collaborate on a new mobile app project. Must have experience with Figma and user research.', 'Austin, TX', 'open', '2024-12-15', 3, NOW(), NOW()),
('Backend API Development', 'job', 'Senior backend developer needed to build scalable APIs using Node.js and PostgreSQL. Experience with microservices architecture required.', 'Seattle, WA', 'closed', '2024-09-30', 2, NOW(), NOW()),
('AI/ML Research Internship', 'internship', 'Exciting opportunity for students interested in artificial intelligence and machine learning. Work on cutting-edge projects with our AI team.', 'Boston, MA', 'open', '2024-11-15', 1, NOW(), NOW()),
('DevOps Engineering Position', 'job', 'DevOps engineer needed to manage our cloud infrastructure. Experience with AWS, Docker, and Kubernetes required.', 'Chicago, IL', 'open', '2024-12-20', 2, NOW(), NOW()),
('Mobile App Development', 'other', 'Collaborative project to develop a cross-platform mobile app using React Native. Looking for developers with mobile experience.', 'Denver, CO', 'open', '2024-11-30', 3, NOW(), NOW());


