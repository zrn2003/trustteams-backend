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
      'SELECT id, name, email FROM users WHERE role = ? AND is_active = 1 AND email_verified = 1',
      ['student']
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
       WHERE role = ? AND SUBSTRING_INDEX(email, '@', -1) = ?
       ORDER BY created_at DESC`,
      ['student', myInstitute]
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
      `SELECT id, email, role FROM users WHERE id = ? AND role = ?`,
      [studentId, 'student']
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
      console.log('=== SENDING OPPORTUNITY NOTIFICATIONS (ACADEMIC ROUTE) ===')
      console.log('Fetching active students...')
      
      const students = await getAllActiveStudents()
      console.log(`Found ${students.length} active students:`, students.map(s => ({ id: s.id, name: s.name, email: s.email })))
      
      if (students.length === 0) {
        console.log('❌ No active students found to notify')
        return
      }
      
      const opportunityLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/opportunities/${opportunityId}`
      console.log('Opportunity link:', opportunityLink)
      
      let emailsSent = 0
      let emailsFailed = 0
      
      for (const student of students) {
        try {
          console.log(`Sending email to student: ${student.name} (${student.email})`)
          
          const emailResult = await sendEmail(student.email, 'opportunity', [
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
          
          if (emailResult.success) {
            console.log(`✅ Email sent successfully to ${student.email}`)
            emailsSent++
          } else {
            console.log(`❌ Failed to send email to ${student.email}:`, emailResult.error)
            emailsFailed++
          }
        } catch (emailError) {
          console.error(`❌ Error sending email to ${student.email}:`, emailError)
          emailsFailed++
        }
      }
      
      console.log(`📊 Email notification summary: ${emailsSent} sent, ${emailsFailed} failed`)
      console.log(`Total students notified: ${emailsSent}`)
      
    } catch (emailError) {
      console.error('❌ Error in opportunity notification system:', emailError)
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
      closing_date: opp.closing_date,
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

// Get academic leader profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.currentUser.id
    
    // Get comprehensive user information including all profile fields
    const [userRows] = await pool.query(
      `SELECT id, name, email, role, approval_status, is_active, last_login, created_at, updated_at, 
               institute_name, phone, address, position, department, bio
        FROM users WHERE id = ?`,
      [userId]
    )
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' })
    }
    
    const userProfile = userRows[0]
    
    // Get education information
    const [educationRows] = await pool.query(
      'SELECT * FROM user_education WHERE user_id = ? ORDER BY start_date DESC',
      [userId]
    )
    
    // Get project information
    const [projectRows] = await pool.query(
      'SELECT * FROM user_projects WHERE user_id = ? ORDER BY start_date DESC',
      [userId]
    )
    
    // Get skills and research areas
    const [skillRows] = await pool.query(
      'SELECT * FROM user_skills WHERE user_id = ? ORDER BY skill_name',
      [userId]
    )
    
    // Get work experience
    const [experienceRows] = await pool.query(
      'SELECT * FROM user_experience WHERE user_id = ? ORDER BY start_date DESC',
      [userId]
    )
    
    // Return the complete profile with all sections
    res.json({
      success: true,
      profile: {
        ...userProfile,
        education: educationRows,
        projects: projectRows,
        skills: skillRows,
        experience: experienceRows
      }
    })
  } catch (error) {
    console.error('Error fetching academic leader profile:', error)
    res.status(500).json({ message: 'Failed to fetch profile' })
  }
})

// Update academic leader profile
router.put('/profile', async (req, res) => {
  try {
    const userId = req.currentUser.id
    const { 
      name, 
      email, 
      institute_name,
      phone,
      address,
      position,
      department,
      bio,
      education,
      projects,
      skills,
      experience
    } = req.body
    
    console.log('Updating academic leader profile:', { 
      userId, 
      name, 
      email, 
      institute_name,
      phone,
      address,
      position,
      department,
      bio,
      educationCount: education?.length || 0,
      projectsCount: projects?.length || 0,
      skillsCount: skills?.length || 0,
      experienceCount: experience?.length || 0
    })
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' })
    }
    
    // Check if email is already taken by another user
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    )
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email is already taken by another user' })
    }
    
    // Start a transaction to update all profile sections
    const connection = await pool.getConnection()
    await connection.beginTransaction()
    
    try {
      // Update basic user profile
      const [userResult] = await connection.query(
        `UPDATE users 
         SET name = ?, email = ?, institute_name = ?, phone = ?, address = ?, 
             position = ?, department = ?, bio = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          name, 
          email, 
          institute_name || '', 
          phone || '', 
          address || '', 
          position || '', 
          department || '', 
          bio || '', 
          userId
        ]
      )
      
      if (userResult.affectedRows === 0) {
        throw new Error('Profile not found')
      }
      
      // Update education information
      if (education && Array.isArray(education)) {
        // Delete existing education records
        await connection.query('DELETE FROM user_education WHERE user_id = ?', [userId])
        
        // Insert new education records
        for (const edu of education) {
          if (edu.degree && edu.institution && edu.field_of_study) {
            await connection.query(
              `INSERT INTO user_education (user_id, degree, institution, field_of_study, start_date, end_date, grade, description, is_current) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                userId, edu.degree, edu.institution, edu.field_of_study, 
                edu.start_date || null, edu.end_date || null, edu.grade || null, 
                edu.description || null, edu.is_current || false
              ]
            )
          }
        }
      }
      
      // Update project information
      if (projects && Array.isArray(projects)) {
        // Delete existing project records
        await connection.query('DELETE FROM user_projects WHERE user_id = ?', [userId])
        
        // Insert new project records
        for (const proj of projects) {
          if (proj.project_name && proj.description) {
            await connection.query(
              `INSERT INTO user_projects (user_id, project_name, project_type, description, technologies_used, start_date, end_date, is_current, project_url, github_url, achievements) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                userId, proj.project_name, proj.project_type || 'academic', proj.description,
                proj.technologies_used || null, proj.start_date || null, proj.end_date || null,
                proj.is_current || false, proj.project_url || null, proj.github_url || null, proj.achievements || null
              ]
            )
          }
        }
      }
      
      // Update skills and research areas
      if (skills && Array.isArray(skills)) {
        // Delete existing skill records
        await connection.query('DELETE FROM user_skills WHERE user_id = ?', [userId])
        
        // Insert new skill records
        for (const skill of skills) {
          if (skill.skill_name) {
            await connection.query(
              `INSERT INTO user_skills (user_id, skill_name, skill_category, proficiency_level, years_of_experience, description) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                userId, skill.skill_name, skill.skill_category || 'technical', 
                skill.proficiency_level || 'intermediate', skill.years_of_experience || null, skill.description || null
              ]
            )
          }
        }
      }
      
      // Update work experience
      if (experience && Array.isArray(experience)) {
        // Delete existing experience records
        await connection.query('DELETE FROM user_experience WHERE user_id = ?', [userId])
        
        // Insert new experience records
        for (const exp of experience) {
          if (exp.title && exp.company && exp.description) {
            await connection.query(
              `INSERT INTO user_experience (user_id, title, company, location, start_date, end_date, is_current, description, achievements) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                userId, exp.title, exp.company, exp.location || null, exp.start_date || null, 
                exp.end_date || null, exp.is_current || false, exp.description, exp.achievements || null
              ]
            )
          }
        }
      }
      
      // Commit the transaction
      await connection.commit()
      
      console.log('Academic leader profile updated successfully with all sections')
      
      // Fetch updated profile with all sections
      const [updatedUser] = await pool.query(
        `SELECT id, name, email, role, approval_status, is_active, created_at, updated_at, 
                 last_login, institute_name, phone, address, position, department, bio
          FROM users WHERE id = ?`,
        [userId]
      )
      
      // Get updated education, projects, skills, and experience
      const [educationRows] = await pool.query(
        'SELECT * FROM user_education WHERE user_id = ? ORDER BY start_date DESC',
        [userId]
      )
      
      const [projectRows] = await pool.query(
        'SELECT * FROM user_projects WHERE user_id = ? ORDER BY start_date DESC',
        [userId]
      )
      
      const [skillRows] = await pool.query(
        'SELECT * FROM user_skills WHERE user_id = ? ORDER BY skill_name',
        [userId]
      )
      
      const [experienceRows] = await pool.query(
        'SELECT * FROM user_experience WHERE user_id = ? ORDER BY start_date DESC',
        [userId]
      )
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        profile: {
          ...updatedUser[0],
          education: educationRows,
          projects: projectRows,
          skills: skillRows,
          experience: experienceRows
        }
      })
      
    } catch (error) {
      // Rollback on error
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
    
  } catch (error) {
    console.error('Error updating academic leader profile:', error)
    res.status(500).json({ message: 'Failed to update profile: ' + error.message })
  }
})

export default router
