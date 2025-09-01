import express from 'express'
import pool from '../db.js'
import { sendEmail, generateVerificationToken, generateVerificationLink } from '../config/email.js'

const router = express.Router()

// Helper to normalize name fields
function buildDisplayName(body) {
  const { firstName, lastName, name } = body || {}
  const trimmedFirst = (firstName || '').trim()
  const trimmedLast = (lastName || '').trim()
  const trimmedName = (name || '').trim()
  if (trimmedFirst || trimmedLast) return `${trimmedFirst} ${trimmedLast}`.trim()
  return trimmedName
}

// Map userType to role used in DB (supports: admin, manager, viewer, student)
function mapUserTypeToRole(userType) {
  const t = (userType || '').toLowerCase()
  if (t === 'student') return 'student'
  if (t === 'academic' || t === 'academic_leader' || t === 'leader') return 'academic_leader'
  if (t === 'university' || t === 'university_admin' || t === 'university administration') return 'university_admin'
  if (t === 'icm' || t === 'manager' || t === 'admin') return 'manager'
  return 'viewer'
}

// Prefer explicit role from body when provided; fallback to userType mapping
function deriveRoleFromBody(body) {
  const explicitRole = (body?.role || '').toLowerCase()
  const userType = (body?.userType || '').toLowerCase()

  if (explicitRole === 'student' || userType === 'student') return 'student'
  if (explicitRole === 'academic_leader' || userType === 'academic' || userType === 'academic_leader') return 'academic_leader'
  // Normalize common synonyms to university_admin
  if (explicitRole === 'university_admin' || explicitRole === 'university' || userType === 'university' || userType === 'university administration') return 'university_admin'

  if (['admin', 'manager', 'viewer'].includes(explicitRole)) return explicitRole

  return mapUserTypeToRole(userType)
}

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    console.log('=== SIGNUP REQUEST START ===')
    console.log('Request body:', JSON.stringify(req.body, null, 2))
    
    const { email, password, university_id, institute_name } = req.body || {}
    const displayName = buildDisplayName(req.body)

    console.log('Parsed data:', {
      displayName,
      email,
      university_id,
      institute_name,
      hasPassword: !!password
    })

    // Basic validation aligned with frontend
    if (!displayName || !email || !password) {
      console.log('Validation failed: missing required fields')
      return res.status(400).json({ message: 'Name, email and password are required' })
    }

    if (password.length < 6) {
      console.log('Validation failed: password too short')
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    // Check if user already exists
    try {
      console.log('Checking for existing user with email:', email)
      const [existingUsers] = await pool.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      )

      if (existingUsers.length > 0) {
        console.log('User already exists with email:', email)
        return res.status(400).json({ message: 'User with this email already exists' })
      }
      console.log('No existing user found')
    } catch (dbError) {
      console.error('Database connection error during signup:', dbError)
      return res.status(500).json({ 
        message: 'Database connection error. Please try again later.',
        details: dbError.message 
      })
    }

    const role = deriveRoleFromBody(req.body)
    console.log('Derived role:', role)

    // Handle different registration flows based on role
    if (role === 'university_admin') {
      console.log('Processing university admin registration')
      // University admin registration - can create new university or select existing
      const { university_name, university_domain, university_address, university_website, university_contact_email, university_contact_phone, university_established_year } = req.body

      let universityId = university_id

      try {
        // If university_id is provided, use existing university
        if (university_id) {
          console.log('Using existing university ID:', university_id)
          // Check if university exists
          const [universities] = await pool.query(
            'SELECT id FROM universities WHERE id = ? AND is_active = true',
            [university_id]
          )

          if (universities.length === 0) {
            console.log('University not found with ID:', university_id)
            return res.status(400).json({ message: 'University not found' })
          }

          // Check if university already has an admin
          const [existingAdmins] = await pool.query(
            'SELECT id FROM users WHERE university_id = ? AND role = ?',
            [university_id, 'university_admin']
          )

          if (existingAdmins.length > 0) {
            console.log('University already has an admin')
            return res.status(400).json({ message: 'University already has an administrator' })
          }
        } else {
          console.log('Creating new university')
          // Create new university
          if (!university_name || !university_domain) {
            console.log('Missing university name or domain')
            return res.status(400).json({ message: 'University name and domain are required for new university creation' })
          }

          // Check if university with this name or domain already exists
          const [existingUniversities] = await pool.query(
            'SELECT id FROM universities WHERE name = ? OR domain = ?',
            [university_name, university_domain]
          )

          if (existingUniversities.length > 0) {
            console.log('University with name or domain already exists')
            return res.status(400).json({ message: 'University with this name or domain already exists' })
          }

          // Create new university
          console.log('Inserting new university')
          const [universityResult] = await pool.query(
            'INSERT INTO universities (name, domain, address, website, contact_email, contact_phone, established_year, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, true)',
            [university_name, university_domain, university_address, university_website, university_contact_email, university_contact_phone, university_established_year]
          )

          universityId = universityResult.insertId
          console.log('New university created with ID:', universityId)
        }

        // Create university admin (auto-approved)
        console.log('Creating university admin user')
        
        // Generate email verification token
        const verificationToken = generateVerificationToken();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        const [result] = await pool.query(
          'INSERT INTO users (name, email, password, role, university_id, approval_status, is_active, email_verified, email_verification_token, email_verification_expires, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
          [displayName, email, password, role, universityId, 'approved', true, false, verificationToken, verificationExpires]
        )

        console.log('University admin created successfully with ID:', result.insertId)
        
        // Send verification email
        const verificationLink = generateVerificationLink(verificationToken);
        const emailResult = await sendEmail(email, 'verification', [displayName, verificationLink]);
        
        if (!emailResult.success) {
          console.warn('Failed to send verification email:', emailResult.error);
        }
        
        return res.status(201).json({
          message: 'University administrator created successfully. Please check your email to verify your account.',
          user: {
            id: result.insertId,
            name: displayName,
            email,
            role,
            university_id: universityId,
            approval_status: 'approved'
          }
        })
      } catch (dbError) {
        console.error('Database error during university admin signup:', dbError)
        console.error('Error stack:', dbError.stack)
        
        // If tables don't exist, return a helpful error message
        if (dbError.message.includes("doesn't exist")) {
          return res.status(500).json({ 
            message: 'Database setup incomplete. Please contact the administrator to set up the database tables.',
            details: 'Required database tables are missing'
          })
        }
        
        return res.status(500).json({ 
          message: 'Database error during registration. Please try again later.',
          details: dbError.message 
        })
      }
    } else if (role === 'student' || role === 'academic_leader') {
      console.log('Processing student/academic leader registration')
      // Student/Academic Leader registration - requires university validation and approval
      if (!university_id || !institute_name) {
        console.log('Missing university_id or institute_name')
        return res.status(400).json({ message: 'University ID and institute name are required for student/academic leader registration' })
      }

      try {
        console.log('Checking if university exists:', university_id)
        // Check if university exists
        const [universities] = await pool.query(
          'SELECT id, name FROM universities WHERE id = ? AND is_active = true',
          [university_id]
        )

        if (universities.length === 0) {
          console.log('University not found:', university_id)
          return res.status(400).json({ message: 'University not found. Please select a valid university.' })
        }

        console.log('University found:', universities[0].name)

        // Check if university has an admin
        console.log('Checking if university has an admin')
        const [universityAdmins] = await pool.query(
          'SELECT id FROM users WHERE university_id = ? AND role = ? AND approval_status = ?',
          [university_id, 'university_admin', 'approved']
        )

        if (universityAdmins.length === 0) {
          console.log('University has no approved admin')
          return res.status(400).json({ message: 'University does not have an administrator yet. Please contact the system administrator.' })
        }

        console.log('University has admin, creating user')
        // Create user with pending approval
        
        // Generate email verification token
        const verificationToken = generateVerificationToken();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        const [result] = await pool.query(
          'INSERT INTO users (name, email, password, role, university_id, institute_name, approval_status, is_active, email_verified, email_verification_token, email_verification_expires, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
          [displayName, email, password, role, university_id, institute_name, 'pending', false, false, verificationToken, verificationExpires]
        )

        console.log('User created with ID:', result.insertId)

        // Create registration request
        console.log('Creating registration request')
        await pool.query(
          'INSERT INTO registration_requests (user_id, university_id, institute_name, role, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
          [result.insertId, university_id, institute_name, role, 'pending']
        )

        console.log('Registration request created successfully')
        
        // Send verification email
        const verificationLink = generateVerificationLink(verificationToken);
        const emailResult = await sendEmail(email, 'verification', [displayName, verificationLink]);
        
        if (!emailResult.success) {
          console.warn('Failed to send verification email:', emailResult.error);
        }
        
        return res.status(201).json({
          message: 'Registration request submitted successfully. Please check your email to verify your account, then wait for university administrator approval.',
          user: {
            id: result.insertId,
            name: displayName,
            email,
            role,
            university_id,
            institute_name,
            approval_status: 'pending'
          }
        })
      } catch (dbError) {
        console.error('Database error during student/academic leader signup:', dbError)
        console.error('Error stack:', dbError.stack)
        console.error('Error details:', {
          message: dbError.message,
          code: dbError.code,
          sqlMessage: dbError.sqlMessage,
          sqlState: dbError.sqlState
        })
        
        // If tables don't exist, return a helpful error message
        if (dbError.message.includes("doesn't exist")) {
          return res.status(500).json({ 
            message: 'Database setup incomplete. Please contact the administrator to set up the database tables.',
            details: 'Required database tables are missing'
          })
        }
        
        return res.status(500).json({ 
          message: 'Database error during registration. Please try again later.',
          details: dbError.message 
        })
      }
    } else {
      console.log('Processing ICM role registration:', role)
      // ICM roles (admin, manager, viewer) - auto-approved
      try {
        // Generate email verification token
        const verificationToken = generateVerificationToken();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        const [result] = await pool.query(
          'INSERT INTO users (name, email, password, role, approval_status, is_active, email_verified, email_verification_token, email_verification_expires, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
          [displayName, email, password, role, 'approved', true, false, verificationToken, verificationExpires]
        )

        console.log('ICM user created successfully with ID:', result.insertId)
        
        // Send verification email
        const verificationLink = generateVerificationLink(verificationToken);
        const emailResult = await sendEmail(email, 'verification', [displayName, verificationLink]);
        
        if (!emailResult.success) {
          console.warn('Failed to send verification email:', emailResult.error);
        }
        
        return res.status(201).json({
          message: 'User created successfully. Please check your email to verify your account.',
          user: {
            id: result.insertId,
            name: displayName,
            email,
            role,
            approval_status: 'approved'
          }
        })
      } catch (dbError) {
        console.error('Database error during ICM role signup:', dbError)
        console.error('Error stack:', dbError.stack)
        
        // If tables don't exist, return a helpful error message
        if (dbError.message.includes("doesn't exist")) {
          return res.status(500).json({ 
            message: 'Database setup incomplete. Please contact the administrator to set up the database tables.',
            details: 'Required database tables are missing'
          })
        }
        
        return res.status(500).json({ 
          message: 'Database error during registration. Please try again later.',
          details: dbError.message 
        })
      }
    }
  } catch (error) {
    console.error('=== SIGNUP ERROR ===')
    console.error('Signup error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    })
    return res.status(500).json({ 
      message: 'Internal server error',
      details: error.message 
    })
  }
})

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    // Find user by email
    const [users] = await pool.query(
      'SELECT id, name, email, password, role, approval_status, is_active, university_id, institute_name, email_verified FROM users WHERE email = ?',
      [email]
    )

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const user = users[0]

    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' })
    }

    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(401).json({ 
        message: 'Please verify your email before logging in. Check your inbox for a verification link.',
        requiresVerification: true
      })
    }

    // Check approval status for student and academic_leader roles
    if ((user.role === 'student' || user.role === 'academic_leader') && user.approval_status !== 'approved') {
      if (user.approval_status === 'pending') {
        return res.status(403).json({ 
          message: 'Your registration is pending approval from the university administrator. Please wait for approval before logging in.',
          approval_status: 'pending'
        })
      } else if (user.approval_status === 'rejected') {
        return res.status(403).json({ 
          message: 'Your registration has been rejected. Please contact the university administrator for more information.',
          approval_status: 'rejected'
        })
      }
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id])

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        approval_status: user.approval_status,
        university_id: user.university_id,
        institute_name: user.institute_name
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' })
    }

    const [users] = await pool.query(
      'SELECT id, name, email, role, is_active, last_login, created_at FROM users WHERE id = ?',
      [userId]
    )

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    return res.json({ user: users[0] })
  } catch (error) {
    console.error('Get profile error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    const { name, email, currentPassword, newPassword } = req.body || {}

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' })
    }

    const [users] = await pool.query(
      'SELECT id, name, email, password FROM users WHERE id = ?',
      [userId]
    )

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const user = users[0]
    const updates = []
    const values = []

    if (name && name !== user.name) {
      updates.push('name = ?')
      values.push(name)
    }

    if (email && email !== user.email) {
      const [existingUsers] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      )
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'Email is already taken' })
      }
      updates.push('email = ?')
      values.push(email)
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to change password' })
      }
      if (user.password !== currentPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' })
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' })
      }
      updates.push('password = ?')
      values.push(newPassword)
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No changes provided' })
    }

    values.push(userId)
    await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    )

    return res.json({ message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Update profile error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

// Email verification endpoint
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    console.log('=== EMAIL VERIFICATION REQUEST ===');
    console.log('Token received:', token);
    console.log('Token length:', token ? token.length : 0);

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    // Find user with this verification token
    const [users] = await pool.query(
      'SELECT id, name, email, email_verification_expires, email_verified FROM users WHERE email_verification_token = ?',
      [token]
    );

    console.log('Users found with token:', users.length);
    if (users.length > 0) {
      console.log('User details:', {
        id: users[0].id,
        email: users[0].email,
        email_verified: users[0].email_verified,
        expires: users[0].email_verification_expires
      });
    }

    if (users.length === 0) {
      // Try to find user by email from the token (if it's a valid email format)
      const emailFromToken = token.includes('@') ? token : null;

      if (emailFromToken) {
        const [emailUsers] = await pool.query(
          'SELECT id, name, email, email_verified FROM users WHERE email = ?',
          [emailFromToken]
        );

        if (emailUsers.length > 0) {
          const emailUser = emailUsers[0];
          if (emailUser.email_verified) {
            return res.status(200).json({
              message: 'Email already verified! You can sign in to your account.',
              user: {
                id: emailUser.id,
                name: emailUser.name,
                email: emailUser.email,
                email_verified: true
              }
            });
          }
        }
      }

      console.log('No user found with token, returning invalid token error');
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    const user = users[0];

    // If already verified, generate new token and send fresh verification
    if (user.email_verified) {
      console.log('User already verified, generating new token');
      const newVerificationToken = generateVerificationToken();
      const newVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await pool.query(
        'UPDATE users SET email_verification_token = ?, email_verification_expires = ? WHERE id = ?',
        [newVerificationToken, newVerificationExpires, user.id]
      );

      const verificationLink = generateVerificationLink(newVerificationToken);
      const emailResult = await sendEmail(user.email, 'verification', [user.name, verificationLink]);

      if (!emailResult.success) {
        console.warn('Failed to send new verification email:', emailResult.error);
      }

      return res.status(200).json({
        message: 'New verification email sent! Please check your inbox for the fresh verification link.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          email_verified: true
        }
      });
    }

    // Check if token has expired
    if (new Date() > new Date(user.email_verification_expires)) {
      console.log('Token expired, returning expired error');
      return res.status(400).json({ message: 'Verification token has expired. Please request a new one.' });
    }

    console.log('Token valid, verifying user');
    // Update user to verified and activate account
    await pool.query(
      'UPDATE users SET email_verified = TRUE, is_active = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?',
      [user.id]
    );

    // Send welcome email
    const emailResult = await sendEmail(user.email, 'welcome', [user.name]);

    if (!emailResult.success) {
      console.warn('Failed to send welcome email:', emailResult.error);
    }

    return res.status(200).json({
      message: 'Email verified successfully! You can now sign in to your account.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        email_verified: true
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({
      message: 'Internal server error during email verification',
      details: error.message
    });
  }
});

// Resend verification email endpoint
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email
    const [users] = await pool.query(
      'SELECT id, name, email, email_verified, email_verification_token, email_verification_expires FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    if (user.email_verified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await pool.query(
      'UPDATE users SET email_verification_token = ?, email_verification_expires = ? WHERE id = ?',
      [verificationToken, verificationExpires, user.id]
    );

    // Send verification email
    const verificationLink = generateVerificationLink(verificationToken);
    const emailResult = await sendEmail(user.email, 'verification', [user.name, verificationLink]);

    if (!emailResult.success) {
      return res.status(500).json({ 
        message: 'Failed to send verification email',
        details: emailResult.error
      });
    }

    return res.json({ 
      message: 'Verification email sent successfully. Please check your inbox.' 
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ 
      message: 'Internal server error during resend verification',
      details: error.message
    });
  }
});

export default router


