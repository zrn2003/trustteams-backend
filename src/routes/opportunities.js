import express from 'express'
import pool from '../db.js'

const router = express.Router()

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
      location: opp.location,
      status: opp.status,
      closingDate: opp.closing_date,
      postedBy: opp.posted_by,
      postedByName: opp.postedByName,
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
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    const { title, type, description, location, status, closingDate } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' })
    }

    if (!title || !type || !description || !location || !status) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Validate closing date
    if (closingDate) {
      const closingDateObj = new Date(closingDate)
      if (isNaN(closingDateObj.getTime())) {
        return res.status(400).json({ error: 'Invalid closing date' })
      }
    }

    const [result] = await pool.query(
      `INSERT INTO opportunities (title, type, description, location, status, closing_date, posted_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [title, type, description, location, status, closingDate, userId]
    )

    // Log audit trail
    await pool.query(
      `INSERT INTO opportunity_audit (opportunity_id, action, changed_by, new_values, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [result.insertId, 'CREATE', userId, JSON.stringify(req.body)]
    )

    res.status(201).json({
      message: 'Opportunity created successfully',
      opportunity: {
        id: result.insertId,
        title,
        type,
        description,
        location,
        status,
        closingDate
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
      location: opportunity.location,
      status: opportunity.status,
      closingDate: opportunity.closing_date,
      postedBy: opportunity.posted_by,
      postedByName: opportunity.postedByName,
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
router.put('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    const { id } = req.params
    const { title, type, description, location, status, closingDate } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' })
    }

    if (!title || !type || !description || !location || !status) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Check if opportunity exists
    const [existing] = await pool.query(
      'SELECT * FROM opportunities WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' })
    }

    // Allow editing any opportunity (removed ownership check)

    const oldValues = existing[0]

    // Update opportunity
    await pool.query(
      `UPDATE opportunities 
       SET title = ?, type = ?, description = ?, location = ?, status = ?, closing_date = ?, updated_at = NOW()
       WHERE id = ?`,
      [title, type, description, location, status, closingDate, id]
    )

    // Log audit trail
    await pool.query(
      `INSERT INTO opportunity_audit (opportunity_id, action, changed_by, old_values, new_values, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [id, 'UPDATE', userId, JSON.stringify(oldValues), JSON.stringify(req.body)]
    )

    res.json({ message: 'Opportunity updated successfully' })
  } catch (error) {
    console.error('Update opportunity error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete opportunity (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    const { id } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' })
    }

    // Check if opportunity exists
    const [existing] = await pool.query(
      'SELECT * FROM opportunities WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Opportunity not found' })
    }

    // Allow deleting any opportunity (removed ownership check)

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


