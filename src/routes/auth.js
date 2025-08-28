import express from 'express'
import pool from '../db.js'

const router = express.Router()

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' })
    }

    // Create new user (plaintext password as requested)
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [name, email, password, 'viewer', true]
    )

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: result.insertId,
        name,
        email,
        role: 'viewer'
      }
    })
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Find user by email
    const [users] = await pool.query(
      'SELECT id, name, email, password_hash as password, role, is_active FROM users WHERE email = ?',
      [email]
    )

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const user = users[0]

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' })
    }

    // Compare passwords (plaintext as requested)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    )

    // Return user info (without password)
    res.json({
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
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' })
    }

    const [users] = await pool.query(
      'SELECT id, name, email, role, is_active, last_login, created_at FROM users WHERE id = ?',
      [userId]
    )

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user: users[0] })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    const { name, email, currentPassword, newPassword } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' })
    }

    // Get current user
    const [users] = await pool.query(
      'SELECT id, name, email, password_hash as password FROM users WHERE id = ?',
      [userId]
    )

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = users[0]
    const updates = []
    const values = []

    // Update name if provided
    if (name && name !== user.name) {
      updates.push('name = ?')
      values.push(name)
    }

    // Update email if provided
    if (email && email !== user.email) {
      // Check if email is already taken
      const [existingUsers] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      )

      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'Email is already taken' })
      }

      updates.push('email = ?')
      values.push(email)
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' })
      }

      // Verify current password
      if (user.password !== currentPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' })
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' })
      }

             updates.push('password_hash = ?')
       values.push(newPassword)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No changes provided' })
    }

    // Update user
    values.push(userId)
    await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    )

    res.json({ message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router


