import express from 'express'
import pool from '../db.js'
import { sendEmail } from '../config/email.js'

const router = express.Router()

router.post('/fix-role-enum', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`
    )
    const colType = rows?.[0]?.COLUMN_TYPE || ''
    const needsUpdate = !/enum\(/i.test(colType) || !/\b'student'\b/.test(colType)

    if (needsUpdate) {
      await pool.query(
        "ALTER TABLE users MODIFY role ENUM('admin','manager','viewer','student') NOT NULL DEFAULT 'student'"
      )
      return res.json({ updated: true })
    }

    return res.json({ updated: false, message: "ENUM already includes 'student'" })
  } catch (e) {
    console.error('fix-role-enum error:', e)
    return res.status(500).json({ message: 'Failed to update ENUM', error: e?.message })
  }
})

// Check opportunities table schema
router.get('/check-opportunities-schema', async (req, res) => {
  try {
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'opportunities' 
       ORDER BY ORDINAL_POSITION`
    )
    
    return res.json({ 
      table: 'opportunities',
      columns: columns,
      message: 'Schema check completed'
    })
  } catch (e) {
    console.error('check-opportunities-schema error:', e)
    return res.status(500).json({ message: 'Failed to check schema', error: e?.message })
  }
})

// Run opportunity fields migration
router.post('/migrate-opportunity-fields', async (req, res) => {
  try {
    console.log('Starting opportunity fields migration...')
    
    // Check if fields already exist
    const [existingColumns] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'opportunities' 
       AND COLUMN_NAME IN ('requirements', 'stipend', 'duration', 'contact_email', 'contact_phone')`
    )
    
    if (existingColumns.length === 5) {
      return res.json({ 
        updated: false, 
        message: "All opportunity fields already exist" 
      })
    }
    
    // Add new fields one by one to avoid errors
    const fieldsToAdd = [
      { name: 'requirements', type: 'TEXT NULL AFTER description' },
      { name: 'stipend', type: 'VARCHAR(255) NULL AFTER requirements' },
      { name: 'duration', type: 'VARCHAR(255) NULL AFTER stipend' },
      { name: 'contact_email', type: 'VARCHAR(255) NULL AFTER duration' },
      { name: 'contact_phone', type: 'VARCHAR(50) NULL AFTER contact_email' }
    ]
    
    for (const field of fieldsToAdd) {
      try {
        await pool.query(`ALTER TABLE opportunities ADD COLUMN ${field.name} ${field.type}`)
        console.log(`Added column: ${field.name}`)
      } catch (addError) {
        if (addError.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column ${field.name} already exists, skipping...`)
        } else {
          throw addError
        }
      }
    }
    
    // Update type enum
    try {
      await pool.query(`
        ALTER TABLE opportunities 
        MODIFY COLUMN type ENUM('internship', 'job', 'research', 'research_paper', 'project', 'other') NOT NULL
      `)
      console.log('Updated type enum')
    } catch (enumError) {
      console.log('Type enum update failed (may already be correct):', enumError.message)
    }
    
    // Set default values for existing opportunities
    await pool.query(`
      UPDATE opportunities 
      SET requirements = COALESCE(requirements, 'Not specified'),
          stipend = COALESCE(stipend, 'Not specified'),
          duration = COALESCE(duration, 'Not specified'),
          contact_email = COALESCE(contact_email, 'contact@university.edu'),
          contact_phone = COALESCE(contact_phone, 'Not specified')
      WHERE requirements IS NULL OR stipend IS NULL OR duration IS NULL 
         OR contact_email IS NULL OR contact_phone IS NULL
    `)
    
    console.log('Opportunity fields migration completed successfully')
    return res.json({ 
      updated: true, 
      message: "Opportunity fields migration completed successfully" 
    })
    
  } catch (e) {
    console.error('migrate-opportunity-fields error:', e)
    return res.status(500).json({ 
      message: 'Failed to migrate opportunity fields', 
      error: e?.message 
    })
  }
})

// Add debug route for applications table migration
router.post('/migrate-applications-table', async (req, res) => {
  try {
    console.log('Starting applications table migration...')

    // Check if table already exists
    const [tables] = await pool.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'opportunity_applications'`
    )

    if (tables.length > 0) {
      return res.json({
        updated: false,
        message: "Applications table already exists"
      })
    }

    // Create opportunity applications table
    await pool.query(`
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
      )
    `)

    // Add sample applications for testing
    await pool.query(`
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
        1, 2, 'pending',
        'I am passionate about machine learning and computer vision. I have completed courses in Python programming, data structures, and introductory machine learning. I am excited to contribute to your research team and learn from experienced researchers.',
        3.8, '2025-05-15',
        'CS 101: Introduction to Programming\nCS 201: Data Structures and Algorithms\nCS 301: Machine Learning Fundamentals\nMATH 201: Linear Algebra',
        'Python, TensorFlow, NumPy, Pandas, Scikit-learn, Git',
        'Completed 2 machine learning projects, participated in hackathon, member of CS club'
      ),
      (
        2, 3, 'approved',
        'I have been developing web applications for the past year using React and Node.js. I am looking for an internship to gain professional experience and contribute to real-world projects.',
        3.6, '2025-12-20',
        'CS 101: Introduction to Programming\nCS 202: Web Development\nCS 303: Database Systems\nCS 304: Software Engineering',
        'React, Node.js, JavaScript, HTML, CSS, MongoDB, Git',
        'Built 3 web applications, freelanced for small businesses, active open source contributor'
      ),
      (
        1, 4, 'rejected',
        'I am interested in research opportunities and have a strong academic background in mathematics and computer science.',
        3.4, '2025-08-10',
        'CS 101: Introduction to Programming\nMATH 201: Linear Algebra\nMATH 202: Calculus II\nSTAT 201: Statistics',
        'Python, MATLAB, R, LaTeX, Git',
        'Research assistant for math department, published 1 paper, teaching assistant for CS 101'
      )
    `)

    // Add indexes for better performance
    await pool.query(`
      CREATE INDEX idx_applications_opportunity_status ON opportunity_applications(opportunity_id, status)
    `)
    await pool.query(`
      CREATE INDEX idx_applications_student_status ON opportunity_applications(student_id, status)
    `)
    await pool.query(`
      CREATE INDEX idx_applications_date_range ON opportunity_applications(application_date, status)
    `)

    console.log('Applications table migration completed successfully')
    return res.json({
      updated: true,
      message: "Applications table migration completed successfully"
    })

  } catch (e) {
    console.error('migrate-applications-table error:', e)
    return res.status(500).json({
      message: 'Failed to migrate applications table',
      error: e?.message
    })
  }
})

// Test email endpoint for debugging
router.post('/test-email', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ 
        message: 'Email and name are required',
        error: 'Missing required fields'
      });
    }

    console.log('=== TEST EMAIL DEBUG ===');
    console.log('Testing email to:', email);
    console.log('Email config check:', {
      EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Missing',
      EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Missing',
      FRONTEND_URL: process.env.FRONTEND_URL || 'Not set'
    });

    // Test email sending
    const testToken = 'test-token-' + Date.now();
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${testToken}`;
    
    const emailResult = await sendEmail(email, 'verification', [name, verificationLink]);
    
    console.log('Email result:', emailResult);
    
    return res.json({
      message: 'Email test completed',
      emailSent: emailResult.success,
      emailError: emailResult.success ? null : emailResult.error,
      emailConfig: {
        EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Missing',
        EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Missing',
        FRONTEND_URL: process.env.FRONTEND_URL || 'Not set'
      },
      testData: {
        to: email,
        name: name,
        verificationLink: verificationLink
      }
    });

  } catch (error) {
    console.error('Test email error:', error);
    return res.status(500).json({ 
      message: 'Test email failed',
      error: error.message,
      stack: error.stack
    });
  }
});

// Comprehensive email test endpoint for debugging
router.post('/test-email-comprehensive', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ 
        message: 'Email and name are required',
        error: 'Missing required fields'
      });
    }

    console.log('=== COMPREHENSIVE EMAIL TEST ===');
    console.log('Testing email to:', email);
    console.log('Test name:', name);
    
    // 1. Check environment variables
    console.log('1. Environment Variables Check:');
    const envCheck = {
      EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Missing',
      EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Missing',
      FRONTEND_URL: process.env.FRONTEND_URL || 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    };
    console.log('Environment check:', envCheck);
    
    // 2. Test email configuration
    console.log('2. Testing email configuration...');
    let transporter;
    try {
      const { createTransporter } = await import('../config/email.js');
      transporter = createTransporter();
      console.log('✅ Transporter created successfully');
    } catch (transporterError) {
      console.error('❌ Transporter creation failed:', transporterError);
      return res.json({
        message: 'Email test failed at transporter creation',
        emailSent: false,
        emailError: transporterError.message,
        stage: 'transporter_creation',
        envCheck
      });
    }
    
    // 3. Test email sending
    console.log('3. Testing email sending...');
    const testToken = 'test-token-' + Date.now();
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${testToken}`;
    
    try {
      const emailResult = await sendEmail(email, 'verification', [name, verificationLink]);
      console.log('Email sending result:', emailResult);
      
      return res.json({
        message: 'Comprehensive email test completed',
        emailSent: emailResult.success,
        emailError: emailResult.success ? null : emailResult.error,
        emailDetails: emailResult.details || null,
        stage: 'email_sending',
        envCheck,
        testData: {
          to: email,
          name: name,
          verificationLink: verificationLink,
          token: testToken
        }
      });
      
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      return res.json({
        message: 'Email test failed during sending',
        emailSent: false,
        emailError: emailError.message,
        stage: 'email_sending',
        envCheck,
        testData: {
          to: email,
          name: name,
          verificationLink: verificationLink,
          token: testToken
        }
      });
    }

  } catch (error) {
    console.error('❌ Comprehensive email test error:', error);
    return res.status(500).json({ 
      message: 'Comprehensive email test failed',
      error: error.message,
      stack: error.stack
    });
  }
});

// Temporary endpoint to bypass email verification for testing
router.post('/bypass-email-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required',
        error: 'Missing email'
      });
    }

    console.log('=== BYPASSING EMAIL VERIFICATION ===');
    console.log('Email:', email);
    
    // Find user by email
    const [users] = await pool.query(
      'SELECT id, name, email, email_verified FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'No user with this email exists'
      });
    }
    
    const user = users[0];
    
    if (user.email_verified) {
      return res.json({ 
        message: 'User already verified',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          email_verified: true
        }
      });
    }
    
    // Mark user as verified
    await pool.query(
      'UPDATE users SET email_verified = TRUE, is_active = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?',
      [user.id]
    );
    
    console.log('✅ User email verification bypassed successfully');
    
    return res.json({
      message: 'Email verification bypassed successfully. User can now log in.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        email_verified: true
      }
    });

  } catch (error) {
    console.error('❌ Bypass email verification error:', error);
    return res.status(500).json({ 
      message: 'Failed to bypass email verification',
      error: error.message
    });
  }
});

export default router
