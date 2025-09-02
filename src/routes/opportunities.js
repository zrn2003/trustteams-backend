import express from 'express'
import pool from '../db.js'
import { sendEmail } from '../config/email.js'

const router = express.Router()

// Authentication middleware
const requireAuth = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id']
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    // Verify user exists and is active
    const [users] = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ? AND is_active = 1',
      [userId]
    )
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' })
    }
    
    req.user = users[0]
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

// Helper function to get user role
async function getUserRole(userId) {
  try {
    const [users] = await pool.query(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    )
    return users.length > 0 ? users[0].role : null
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}

// Helper function to get all active students
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

// Get all opportunities with search, filtering, and pagination
router.get('/', async (req, res) => {
  try {
    const {
      search,
      status,
      type,
      location,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      limit = 10,
      offset = 0
    } = req.query

    let query = `
      SELECT o.*, u.name as postedByName
      FROM opportunities o
      LEFT JOIN users u ON o.posted_by = u.id
      WHERE o.deleted_at IS NULL
    `
    const queryParams = []

    // Add search filter
    if (search) {
      query += ` AND (MATCH(o.title, o.description) AGAINST(? IN BOOLEAN MODE) OR o.title LIKE ? OR o.description LIKE ?)`
      queryParams.push(search, `%${search}%`, `%${search}%`)
    }

    // Add status filter
    if (status) {
      query += ` AND o.status = ?`
      queryParams.push(status)
    }

    // Add type filter
    if (type) {
      query += ` AND o.type = ?`
      queryParams.push(type)
    }

    // Add location filter
    if (location) {
      query += ` AND o.location LIKE ?`
      queryParams.push(`%${location}%`)
    }

    // Add sorting
    const allowedSortFields = ['created_at', 'title', 'closing_date', 'status', 'type']
    const allowedSortOrders = ['ASC', 'DESC']
    
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at'
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC'
    
    query += ` ORDER BY o.${finalSortBy} ${finalSortOrder}`

    // Add pagination
    query += ` LIMIT ? OFFSET ?`
    queryParams.push(parseInt(limit), parseInt(offset))

    const [opportunities] = await pool.query(query, queryParams)

    // Auto-update expired opportunities from 'open' to 'closed'
    const now = new Date()
    const expiredOpportunities = opportunities.filter(opp => 
      opp.status === 'open' && 
      opp.closing_date && 
      new Date(opp.closing_date) < now
    )
    
    if (expiredOpportunities.length > 0) {
      const expiredIds = expiredOpportunities.map(opp => opp.id)
      await pool.query(
        `UPDATE opportunities SET status = 'closed', updated_at = NOW() WHERE id IN (${expiredIds.map(() => '?').join(',')})`,
        expiredIds
      )
      
      // Log audit trail for auto-closed opportunities
      for (const opp of expiredOpportunities) {
        await pool.query(
          `INSERT INTO opportunity_audit (opportunity_id, action, changed_by, old_values, new_values, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [opp.id, 'AUTO_CLOSE', opp.posted_by, JSON.stringify({ status: 'open' }), JSON.stringify({ status: 'closed' })]
        )
      }
      
      // Re-fetch the opportunities to get updated status
      const [updatedOpportunities] = await pool.query(query, queryParams)
      opportunities.length = 0
      opportunities.push(...updatedOpportunities)
    }

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
      deletedAt: opp.deleted_at,
      createdAt: opp.created_at,
      updatedAt: opp.updated_at
    }))

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM opportunities o
      WHERE o.deleted_at IS NULL
    `
    const countParams = []

    if (search) {
      countQuery += ` AND (MATCH(o.title, o.description) AGAINST(? IN BOOLEAN MODE) OR o.title LIKE ? OR o.description LIKE ?)`
      countParams.push(search, `%${search}%`, `%${search}%`)
    }

    if (status) {
      countQuery += ` AND o.status = ?`
      countParams.push(status)
    }

    if (type) {
      countQuery += ` AND o.type = ?`
      countParams.push(type)
    }

    if (location) {
      countQuery += ` AND o.location LIKE ?`
      countParams.push(`%${location}%`)
    }

    const [countResult] = await pool.query(countQuery, countParams)
    const total = countResult[0].total

    res.json({
      opportunities: transformedOpportunities,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Get opportunities error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create new opportunity
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role
    
    // Check if user is authorized to post opportunities
    if (!['academic_leader', 'icm', 'university_admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Only academic leaders, ICMs, and university admins can post opportunities' })
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

    const [result] = await pool.query(
      `INSERT INTO opportunities (
        title, type, description, requirements, stipend, duration, 
        location, status, closing_date, posted_by, contact_email, contact_phone, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [title, type, description, requirements || null, stipend || null, duration || null, 
       location || 'Not specified', status, closingDate, userId, contact_email || null, contact_phone || null]
    )

    // Log audit trail
    await pool.query(
      `INSERT INTO opportunity_audit (opportunity_id, action, changed_by, new_values, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [result.insertId, 'CREATE', userId, JSON.stringify({
        title, type, description, requirements, stipend, duration, 
        location, status, closing_date: closingDate, contact_email, contact_phone
      })]
    )

    // Send notification emails to all students
    try {
      const students = await getAllActiveStudents()
      const opportunityLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/opportunities/${result.insertId}`
      
      for (const student of students) {
        await sendEmail(student.email, 'opportunity', [
          student.name,
          req.user.name,
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
      }
      
      console.log(`Sent opportunity notifications to ${students.length} students`)
    } catch (emailError) {
      console.error('Error sending opportunity notifications:', emailError)
      // Don't fail the request if email sending fails
    }

    res.status(201).json({
      message: 'Opportunity created successfully and notifications sent to students',
      opportunity: {
        id: result.insertId,
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
        posted_by: userId
      }
    })
  } catch (error) {
    console.error('Create opportunity error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single opportunity
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const [opportunities] = await pool.query(
      `SELECT o.*, u.name as postedByName
       FROM opportunities o
       LEFT JOIN users u ON o.posted_by = u.id
       WHERE o.id = ? AND o.deleted_at IS NULL`,
      [id]
    )

    if (opportunities.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' })
    }

    // Auto-update expired opportunity from 'open' to 'closed'
    const opportunity = opportunities[0]
    const now = new Date()
    if (opportunity.status === 'open' && 
        opportunity.closing_date && 
        new Date(opportunity.closing_date) < now) {
      
      await pool.query(
        'UPDATE opportunities SET status = ?, updated_at = NOW() WHERE id = ?',
        ['closed', id]
      )
      
      // Log audit trail for auto-closed opportunity
      await pool.query(
        `INSERT INTO opportunity_audit (opportunity_id, action, changed_by, old_values, new_values, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [id, 'AUTO_CLOSE', opportunity.posted_by, JSON.stringify({ status: 'open' }), JSON.stringify({ status: 'closed' })]
      )
      
      // Update the opportunity object
      opportunity.status = 'closed'
    }

    // Transform field names to match frontend expectations
    const transformedOpportunity = {
      id: opportunity.id,
      title: opportunity.title,
      type: opportunity.type,
      description: opportunity.description,
      requirements: opportunity.requirements,
      stipend: opportunity.stipend,
      duration: opportunity.duration,
      location: opportunity.location,
      status: opportunity.status,
      closingDate: opportunity.closing_date,
      deadline: opportunity.closing_date,
      postedBy: opportunity.posted_by,
      postedByName: opportunity.postedByName,
      contact_email: opportunity.contact_email,
      contact_phone: opportunity.contact_phone,
      deletedAt: opportunity.deleted_at,
      createdAt: opportunity.created_at,
      updatedAt: opportunity.updated_at
    }

    res.json({ opportunity: transformedOpportunity })
  } catch (error) {
    console.error('Get opportunity error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update opportunity
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { id } = req.params
    const { 
      title, 
      type, 
      description, 
      requirements, 
      stipend, 
      duration, 
      location, 
      status, 
      deadline, 
      contact_email, 
      contact_phone 
    } = req.body

    if (!title || !type || !description) {
      return res.status(400).json({ error: 'Title, type, and description are required' })
    }

    // Check if opportunity exists
    const [existing] = await pool.query(
      'SELECT * FROM opportunities WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' })
    }

    // Check user permissions for editing
    const userRole = await getUserRole(userId)
    if (!userRole) {
      return res.status(401).json({ error: 'User not found' })
    }

    // Only allow editing if user is admin OR if user is the original poster
    if (userRole !== 'admin' && existing[0].posted_by != userId) {
      return res.status(403).json({ error: 'You can only edit your own posts' })
    }

    const oldValues = existing[0]

    // Validate deadline if provided
    let closingDate = null
    if (deadline) {
      const deadlineObj = new Date(deadline)
      if (isNaN(deadlineObj.getTime())) {
        return res.status(400).json({ error: 'Invalid deadline date' })
      }
      closingDate = deadlineObj
    }

    // Update opportunity
    await pool.query(
      `UPDATE opportunities 
       SET title = ?, type = ?, description = ?, requirements = ?, stipend = ?, duration = ?, 
           location = ?, status = ?, closing_date = ?, contact_email = ?, contact_phone = ?, updated_at = NOW()
       WHERE id = ?`,
      [title, type, description, requirements || null, stipend || null, duration || null, 
       location || 'Not specified', status || 'open', closingDate, contact_email || null, contact_phone || null, id]
    )

    // Log audit trail
    await pool.query(
      `INSERT INTO opportunity_audit (opportunity_id, action, changed_by, old_values, new_values, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [id, 'UPDATE', userId, JSON.stringify(oldValues), JSON.stringify({
        title, type, description, requirements, stipend, duration, 
        location, status, closing_date: closingDate, contact_email, contact_phone
      })]
    )

    res.json({ message: 'Opportunity updated successfully' })
  } catch (error) {
    console.error('Update opportunity error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete opportunity (soft delete)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { id } = req.params

    // Check if opportunity exists
    const [existing] = await pool.query(
      'SELECT * FROM opportunities WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' })
    }

    // Check user permissions for deletion - only admins can delete
    const userRole = await getUserRole(userId)
    if (!userRole) {
      return res.status(401).json({ error: 'User not found' })
    }

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete posts' })
    }

    // Soft delete
    await pool.query(
      'UPDATE opportunities SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?',
      [id]
    )

    // Log audit trail
    await pool.query(
      `INSERT INTO opportunity_audit (opportunity_id, action, changed_by, old_values, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [id, 'DELETE', userId, JSON.stringify(existing[0])]
    )

    res.json({ message: 'Opportunity deleted successfully' })
  } catch (error) {
    console.error('Delete opportunity error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get audit trail for an opportunity
router.get('/:id/audit', async (req, res) => {
  try {
    const { id } = req.params

    const [auditTrail] = await pool.query(
      `SELECT oa.*, u.name as changedByName
       FROM opportunity_audit oa
       LEFT JOIN users u ON oa.changed_by = u.id
       WHERE oa.opportunity_id = ?
       ORDER BY oa.created_at DESC`,
      [id]
    )

    res.json({ auditTrail })
  } catch (error) {
    console.error('Get audit trail error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Auto-close expired opportunities (can be called by a cron job)
router.post('/auto-close-expired', async (req, res) => {
  try {
    const now = new Date()
    
    // Find expired opportunities that are still open
    const [expiredOpportunities] = await pool.query(
      `SELECT id, posted_by, status, closing_date 
       FROM opportunities 
       WHERE status = 'open' 
       AND closing_date IS NOT NULL 
       AND closing_date < ? 
       AND deleted_at IS NULL`,
      [now]
    )
    
    if (expiredOpportunities.length === 0) {
      return res.json({ 
        message: 'No expired opportunities found',
        closedCount: 0 
      })
    }
    
    // Close them
    const expiredIds = expiredOpportunities.map(opp => opp.id)
    await pool.query(
      `UPDATE opportunities 
       SET status = 'closed', updated_at = NOW() 
       WHERE id IN (${expiredIds.map(() => '?').join(',')})`,
      expiredIds
    )
    
    // Log audit trail for each closed opportunity
    for (const opp of expiredOpportunities) {
      await pool.query(
        `INSERT INTO opportunity_audit (opportunity_id, action, changed_by, old_values, new_values, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [opp.id, 'AUTO_CLOSE', opp.posted_by, JSON.stringify({ status: 'open' }), JSON.stringify({ status: 'closed' })]
      )
    }
    
    res.json({ 
      message: `Successfully closed ${expiredOpportunities.length} expired opportunities`,
      closedCount: expiredOpportunities.length,
      closedIds: expiredIds
    })
    
  } catch (error) {
    console.error('Auto-close expired opportunities error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router


