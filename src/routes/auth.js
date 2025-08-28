import express from 'express'
import pool from '../db.js'

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
    const { email, password } = req.body || {}
    const displayName = buildDisplayName(req.body)

    // Basic validation aligned with frontend
    if (!displayName || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' })
    }

    const role = deriveRoleFromBody(req.body)

    // Debug: log derived role and incoming fields (without password)
    console.log('Signup request -> derivedRole:', role, {
      name: displayName,
      email,
      roleFromBody: (req.body?.role || '').toLowerCase(),
      userTypeFromBody: (req.body?.userType || '').toLowerCase()
    })

    // Create new user (plaintext password per current implementation)
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [displayName, email, password, role, true]
    )

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        id: result.insertId,
        name: displayName,
        email,
        role
      }
    })
  } catch (error) {
    console.error('Signup error:', error)
    return res.status(500).json({ message: 'Internal server error' })
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
      'SELECT id, name, email, password_hash as password, role, is_active FROM users WHERE email = ?',
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

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id])

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
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
      'SELECT id, name, email, password_hash as password FROM users WHERE id = ?',
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
      updates.push('password_hash = ?')
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

export default router


