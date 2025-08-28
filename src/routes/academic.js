import express from 'express'
import pool from '../db.js'

const router = express.Router()

// Middleware to require academic leader role by header (simple for now)
router.use(async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id']
    if (!userId) return res.status(401).json({ message: 'User ID required' })
    const [rows] = await pool.query('SELECT id, role, email FROM users WHERE id = ?', [userId])
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid user' })
    const me = rows[0]
    if (me.role !== 'academic_leader' && me.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    req.currentUser = me
    next()
  } catch (e) {
    console.error('academic auth error', e)
    return res.status(500).json({ message: 'Server error' })
  }
})

// Helper: naive institute inference by email domain (fallback)
function inferInstituteFromEmail(email) {
  const m = (email || '').split('@')[1] || ''
  return m.toLowerCase()
}

// GET /api/academic/students - list students in leader's institute
router.get('/students', async (req, res) => {
  try {
    // If you have users.institute, prefer it. Here we infer by domain as fallback.
    const myInstitute = inferInstituteFromEmail(req.currentUser.email)
    const [rows] = await pool.query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE role = 'student' AND SUBSTRING_INDEX(email, '@', -1) = ?
       ORDER BY created_at DESC`,
      [myInstitute]
    )
    return res.json({ students: rows })
  } catch (e) {
    console.error('list students error', e)
    return res.status(500).json({ message: 'Failed to list students' })
  }
})

// DELETE /api/academic/students/:id - delete student in same institute
router.delete('/students/:id', async (req, res) => {
  try {
    const studentId = Number(req.params.id)
    if (!studentId) return res.status(400).json({ message: 'Invalid id' })

    // Verify student exists and belongs to same institute
    const myInstitute = inferInstituteFromEmail(req.currentUser.email)
    const [rows] = await pool.query(
      `SELECT id, email, role FROM users WHERE id = ? AND role = 'student'`,
      [studentId]
    )
    if (rows.length === 0) return res.status(404).json({ message: 'Student not found' })

    const student = rows[0]
    const studentInstitute = inferInstituteFromEmail(student.email)
    if (studentInstitute !== myInstitute) {
      return res.status(403).json({ message: 'Cannot delete student from another institute' })
    }

    await pool.query('DELETE FROM users WHERE id = ?', [studentId])
    return res.json({ message: 'Student deleted' })
  } catch (e) {
    console.error('delete student error', e)
    return res.status(500).json({ message: 'Failed to delete student' })
  }
})

export default router
