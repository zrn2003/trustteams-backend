import express from 'express'
import pool from '../db.js'
import { sendEmail } from '../config/email.js'

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

// Helper function to get all active students for email notifications
async function getAllActiveStudents() {
  try {
    const [students] = await pool.query(
      'SELECT id, name, email FROM users WHERE role = "student" AND is_active = 1 AND email_verified = 1'
    )
    return students
  } catch (error) {
    console.error('Error getting students:', error)
    return []
  }
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

// POST /api/academic/:academicId/opportunities - create new opportunity with email notifications
router.post('/:academicId/opportunities', async (req, res) => {
  try {
    const academicId = Number(req.params.academicId)
    if (!academicId) return res.status(400).json({ message: 'Invalid academic ID' })

    // Verify the academic leader is creating their own opportunity
    if (academicId !== req.currentUser.id) {
      return res.status(403).json({ message: 'Can only create opportunities for yourself' })
    }

    const { 
      title, 
      type, 
      description, 
      requirements, 
      stipend, 
      duration, 
      location, 
      status = 'open', 
      deadline, 
      contact_email, 
      contact_phone 
    } = req.body

    if (!title || !type || !description) {
      return res.status(400).json({ error: 'Title, type, and description are required' })
    }

    // Validate deadline if provided
    let closingDate = null
    if (deadline) {
      const deadlineObj = new Date(deadline)
      if (isNaN(deadlineObj.getTime())) {
        return res.status(400).json({ error: 'Invalid deadline date' })
      }
      closingDate = deadlineObj
    }

    // Create the opportunity
    const [result] = await pool.query(
      `INSERT INTO opportunities (
        title, type, description, requirements, stipend, duration, 
        location, status, closing_date, posted_by, contact_email, contact_phone, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [title, type, description, requirements || null, stipend || null, duration || null, 
       location || 'Not specified', status, closingDate, academicId, contact_email || null, contact_phone || null]
    )

    const opportunityId = result.insertId

    // Log audit trail
    await pool.query(
      `INSERT INTO opportunity_audit (opportunity_id, action, changed_by, new_values, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [opportunityId, 'CREATE', academicId, JSON.stringify({
        title, type, description, requirements, stipend, duration, 
        location, status, closing_date: closingDate, contact_email, contact_phone
      })]
    )

    // Send notification emails to all verified students
    try {
      const students = await getAllActiveStudents()
      const opportunityLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/opportunities/${opportunityId}`
      
      let emailsSent = 0
      for (const student of students) {
        try {
          await sendEmail(student.email, 'opportunity', [
            student.name,
            req.currentUser.name,
            title,
            type,
            description,
            requirements || 'Not specified',
            stipend || 'Not specified',
            duration || 'Not specified',
            location || 'Not specified',
            closingDate ? new Date(closingDate).toLocaleDateString() : 'No deadline',
            opportunityLink
          ])
          emailsSent++
        } catch (emailError) {
          console.error(`Failed to send email to ${student.email}:`, emailError)
        }
      }
      
      console.log(`Sent opportunity notifications to ${emailsSent} students`)
    } catch (emailError) {
      console.error('Error sending opportunity notifications:', emailError)
      // Don't fail the request if email sending fails
    }

    res.status(201).json({
      message: `Opportunity created successfully and notifications sent to students`,
      opportunity: {
        id: opportunityId,
        title,
        type,
        description,
        requirements,
        stipend,
        duration,
        location,
        status,
        closing_date: closingDate,
        contact_email,
        contact_phone,
        posted_by: academicId
      }
    })
  } catch (error) {
    console.error('Create opportunity error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/academic/:academicId/opportunities - get opportunities posted by academic leader
router.get('/:academicId/opportunities', async (req, res) => {
  try {
    const academicId = Number(req.params.academicId)
    if (!academicId) return res.status(400).json({ message: 'Invalid academic ID' })

    // Verify the academic leader exists and is requesting their own opportunities
    if (academicId !== req.currentUser.id) {
      return res.status(403).json({ message: 'Can only view your own opportunities' })
    }

    const [opportunities] = await pool.query(
      `SELECT o.id, o.title, o.type, o.description, o.requirements, o.stipend, o.duration,
              o.location, o.status, o.closing_date, o.contact_email, o.contact_phone,
              o.posted_by, o.created_at, o.updated_at, u.name as postedByName
       FROM opportunities o
       LEFT JOIN users u ON o.posted_by = u.id
       WHERE o.posted_by = ? AND o.deleted_at IS NULL
       ORDER BY o.created_at DESC`,
      [academicId]
    )

    // Transform field names to match frontend expectations
    const transformedOpportunities = opportunities.map(opp => ({
      id: opp.id,
      title: opp.title,
      type: opp.type,
      description: opp.description,
      requirements: opp.requirements,
      stipend: opp.stipend,
      duration: opp.duration,
      location: opp.location,
      status: opp.status,
      closingDate: opp.closing_date,
      deadline: opp.closing_date,
      postedBy: opp.posted_by,
      postedByName: opp.postedByName,
      contact_email: opp.contact_email,
      contact_phone: opp.contact_phone,
      createdAt: opp.created_at,
      updatedAt: opp.updated_at
    }))

    return res.json({ opportunities: transformedOpportunities })
  } catch (e) {
    console.error('get academic opportunities error', e)
    return res.status(500).json({ message: 'Failed to get opportunities' })
  }
})

export default router
