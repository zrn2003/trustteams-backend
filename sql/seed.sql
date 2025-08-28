-- TrustTeams Seed Data
-- This file populates the database with initial data

USE trustteams;

-- Insert initial users (plaintext passwords as requested)
INSERT INTO users (name, email, password, role, is_active, created_at) VALUES
('Admin User', 'admin@trustteams.com', 'admin123', 'admin', true, NOW()),
('Manager User', 'manager@trustteams.com', 'manager123', 'manager', true, NOW()),
('Viewer User', 'viewer@trustteams.com', 'viewer123', 'viewer', true, NOW()),
('John Doe', 'john@example.com', 'password123', 'viewer', true, NOW()),
('Jane Smith', 'jane@example.com', 'password123', 'manager', true, NOW());

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


