import express from 'express'
import pool from '../db.js'

const router = express.Router()

// Middleware to require authentication
const requireAuth = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id']
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    const [users] = await pool.query(
      'SELECT id, name, email, role, university_id FROM users WHERE id = ? AND is_active = true',
      [userId]
    )
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid user' })
    }
    
    req.user = users[0]
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

// Get applications for an opportunity (for academic leaders)
router.get('/opportunity/:opportunityId', requireAuth, async (req, res) => {
  try {
    const { opportunityId } = req.params
    const userId = req.user.id

    // Verify the opportunity belongs to the academic leader
    const [opportunities] = await pool.query(
      'SELECT id, title, posted_by FROM opportunities WHERE id = ? AND deleted_at IS NULL',
      [opportunityId]
    )

    if (opportunities.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' })
    }

    const opportunity = opportunities[0]
    if (opportunity.posted_by !== userId && req.user.role !== 'university_admin') {
      return res.status(403).json({ error: 'Not authorized to view applications for this opportunity' })
    }

    // Get applications with student details
    const [applications] = await pool.query(`
      SELECT 
        oa.id,
        oa.status,
        oa.application_date,
        oa.cover_letter,
        oa.gpa,
        oa.expected_graduation,
        oa.relevant_courses,
        oa.skills,
        oa.experience_summary,
        oa.review_notes,
        oa.reviewed_at,
        u.id as student_id,
        u.name as student_name,
        u.email as student_email,
        u.phone as student_phone,
        u.address as student_address,
        u.bio as student_bio,
        u.years_experience,
        u.highest_degree,
        u.field_of_study,
        u.institution,
        u.completion_year,
        u.research_papers,
        u.research_areas,
        u.publications,
        u.projects_completed,
        u.current_projects,
        u.project_experience
      FROM opportunity_applications oa
      JOIN users u ON oa.student_id = u.id
      WHERE oa.opportunity_id = ?
      ORDER BY oa.application_date DESC
    `, [opportunityId])

    res.json({
      opportunity: {
        id: opportunity.id,
        title: opportunity.title
      },
      applications: applications
    })

  } catch (error) {
    console.error('Get applications error:', error)
    res.status(500).json({ error: 'Failed to fetch applications' })
  }
})

// Get applications for a student (for students to view their applications)
router.get('/student/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params
    const userId = req.user.id

    // Students can only view their own applications
    if (req.user.role === 'student' && parseInt(studentId) !== userId) {
      return res.status(403).json({ error: 'Not authorized to view other students\' applications' })
    }

    // Academic leaders can view applications from their university students
    if (req.user.role === 'academic_leader') {
      const [studentCheck] = await pool.query(
        'SELECT university_id FROM users WHERE id = ?',
        [studentId]
      )
      
      if (studentCheck.length === 0 || studentCheck[0].university_id !== req.user.university_id) {
        return res.status(403).json({ error: 'Not authorized to view this student\'s applications' })
      }
    }

    const [applications] = await pool.query(`
      SELECT 
        oa.id,
        oa.status,
        oa.application_date,
        oa.cover_letter,
        oa.gpa,
        oa.expected_graduation,
        oa.relevant_courses,
        oa.skills,
        oa.experience_summary,
        oa.review_notes,
        oa.reviewed_at,
        o.id as opportunity_id,
        o.title as opportunity_title,
        o.type as opportunity_type,
        o.description as opportunity_description,
        o.location as opportunity_location,
        o.stipend as opportunity_stipend,
        o.duration as opportunity_duration,
        u.name as posted_by_name,
        u.email as posted_by_email
      FROM opportunity_applications oa
      JOIN opportunities o ON oa.opportunity_id = o.id
      JOIN users u ON o.posted_by = u.id
      WHERE oa.student_id = ? AND o.deleted_at IS NULL
      ORDER BY oa.application_date DESC
    `, [studentId])

    res.json({ applications })

  } catch (error) {
    console.error('Get student applications error:', error)
    res.status(500).json({ error: 'Failed to fetch applications' })
  }
})

// Apply to an opportunity (for students)
router.post('/apply', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { 
      opportunityId, 
      coverLetter, 
      gpa, 
      expectedGraduation, 
      relevantCourses, 
      skills, 
      experienceSummary 
    } = req.body

    // Verify user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can apply to opportunities' })
    }

    // Check if opportunity exists and is open
    const [opportunities] = await pool.query(
      'SELECT id, status, closing_date FROM opportunities WHERE id = ? AND deleted_at IS NULL',
      [opportunityId]
    )

    if (opportunities.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' })
    }

    const opportunity = opportunities[0]
    if (opportunity.status !== 'open') {
      return res.status(400).json({ error: 'Opportunity is not open for applications' })
    }

    if (opportunity.closing_date && new Date(opportunity.closing_date) < new Date()) {
      return res.status(400).json({ error: 'Opportunity deadline has passed' })
    }

    // Check if already applied
    const [existingApplications] = await pool.query(
      'SELECT id FROM opportunity_applications WHERE opportunity_id = ? AND student_id = ?',
      [opportunityId, userId]
    )

    if (existingApplications.length > 0) {
      return res.status(400).json({ error: 'You have already applied to this opportunity' })
    }

    // Create application
    const [result] = await pool.query(`
      INSERT INTO opportunity_applications (
        opportunity_id, student_id, cover_letter, gpa, expected_graduation,
        relevant_courses, skills, experience_summary, status, application_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `, [
      opportunityId, userId, coverLetter, gpa, expectedGraduation,
      relevantCourses, skills, experienceSummary
    ])

    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: result.insertId
    })

  } catch (error) {
    console.error('Apply to opportunity error:', error)
    res.status(500).json({ error: 'Failed to submit application' })
  }
})

// Update application status (for academic leaders)
router.put('/:applicationId/status', requireAuth, async (req, res) => {
  try {
    const { applicationId } = req.params
    const { status, reviewNotes } = req.body
    const userId = req.user.id

    // Verify user is academic leader or university admin
    if (!['academic_leader', 'university_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to update application status' })
    }

    // Get application with opportunity details
    const [applications] = await pool.query(`
      SELECT 
        oa.id,
        oa.opportunity_id,
        oa.student_id,
        oa.status as current_status,
        o.posted_by,
        o.title as opportunity_title
      FROM opportunity_applications oa
      JOIN opportunities o ON oa.opportunity_id = o.id
      WHERE oa.id = ?
    `, [applicationId])

    if (applications.length === 0) {
      return res.status(404).json({ error: 'Application not found' })
    }

    const application = applications[0]

    // Verify authorization
    if (req.user.role === 'academic_leader' && application.posted_by !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this application' })
    }

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'withdrawn']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    // Update application
    await pool.query(`
      UPDATE opportunity_applications 
      SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = NOW()
      WHERE id = ?
    `, [status, reviewNotes, userId, applicationId])

    res.json({
      message: 'Application status updated successfully',
      applicationId,
      newStatus: status
    })

  } catch (error) {
    console.error('Update application status error:', error)
    res.status(500).json({ error: 'Failed to update application status' })
  }
})

// Withdraw application (for students)
router.put('/:applicationId/withdraw', requireAuth, async (req, res) => {
  try {
    const { applicationId } = req.params
    const userId = req.user.id

    // Verify user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can withdraw applications' })
    }

    // Get application
    const [applications] = await pool.query(
      'SELECT id, student_id, status FROM opportunity_applications WHERE id = ?',
      [applicationId]
    )

    if (applications.length === 0) {
      return res.status(404).json({ error: 'Application not found' })
    }

    const application = applications[0]

    // Verify ownership
    if (application.student_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to withdraw this application' })
    }

    // Check if can be withdrawn
    if (application.status !== 'pending') {
      return res.status(400).json({ error: 'Can only withdraw pending applications' })
    }

    // Update status
    await pool.query(
      'UPDATE opportunity_applications SET status = "withdrawn" WHERE id = ?',
      [applicationId]
    )

    res.json({
      message: 'Application withdrawn successfully',
      applicationId
    })

  } catch (error) {
    console.error('Withdraw application error:', error)
    res.status(500).json({ error: 'Failed to withdraw application' })
  }
})

export default router
