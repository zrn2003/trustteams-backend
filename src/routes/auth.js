import express from 'express'
import pool from '../db.js'

const router = express.Router()

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid input' })
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email])
    if (existing && existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' })
    }

    // Store plaintext password as requested (not recommended for production)
    const passwordHash = String(password)
    const userRole = ['admin', 'manager', 'viewer'].includes(role) ? role : 'viewer' // Default to viewer

    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [email, passwordHash, name || null, userRole]
    )

    return res.status(201).json({
      message: 'Signup successful',
      user: { 
        id: result.insertId, 
        email, 
        name: name || 'User', 
        role: userRole
      }
    })
  } catch (err) {
    console.error('Signup error:', err)
    return res.status(500).json({ message: 'Server error' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid input' })
    }

    const [rows] = await pool.query(
      `SELECT id, email, password_hash AS passwordHash, name, role, is_active
       FROM users 
       WHERE email = ? LIMIT 1`,
      [email]
    )

    if (!rows || rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const user = rows[0]
    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' })
    }

    const stored = user.passwordHash || ''
    const isValid = String(password) === String(stored)
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' })

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id])

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name || 'User',
        role: user.role
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ message: 'Server error' })
  }
})

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' })
    }

    const { name, email, currentPassword, newPassword } = req.body || {}
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' })
    }

    // Check if email is already taken by another user
    const [existingEmail] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1',
      [email, userId]
    )
    if (existingEmail && existingEmail.length > 0) {
      return res.status(409).json({ message: 'Email is already taken by another user' })
    }

    // If changing password, validate current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to change password' })
      }

      const [userRows] = await pool.query(
        'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
        [userId]
      )
      
      if (!userRows || userRows.length === 0) {
        return res.status(404).json({ message: 'User not found' })
      }

      const storedPassword = userRows[0].password_hash
      if (String(currentPassword) !== String(storedPassword)) {
        return res.status(401).json({ message: 'Current password is incorrect' })
      }
    }

    // Update user profile
    const updateFields = ['name = ?', 'email = ?']
    const updateValues = [name, email]

    if (newPassword) {
      updateFields.push('password_hash = ?')
      updateValues.push(String(newPassword))
    }

    updateValues.push(userId)

    await pool.query(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      updateValues
    )

    // Get updated user info
    const [updatedUser] = await pool.query(
      `SELECT id, email, name, role, is_active, last_login
       FROM users 
       WHERE id = ? LIMIT 1`,
      [userId]
    )

    if (!updatedUser || updatedUser.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const user = updatedUser[0]
    return res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLogin: user.last_login
      }
    })
  } catch (err) {
    console.error('Profile update error:', err)
    return res.status(500).json({ message: 'Server error' })
  }
})

// Get current user info
router.get('/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' })
    }

    const [rows] = await pool.query(
      `SELECT id, email, name, role, is_active, last_login
       FROM users 
       WHERE id = ? LIMIT 1`,
      [userId]
    )

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const user = rows[0]
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLogin: user.last_login
      }
    })
  } catch (err) {
    console.error('Get user error:', err)
    return res.status(500).json({ message: 'Server error' })
  }
})

export default router


