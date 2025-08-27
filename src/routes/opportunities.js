import express from 'express'
import pool from '../db.js'

const router = express.Router()

// List opportunities with advanced search and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      type, 
      search, 
      location, 
      sortBy = 'created_at', 
      sortOrder = 'DESC',
      limit = 50,
      offset = 0
    } = req.query
    
    const where = ['deleted_at IS NULL']
    const params = []
    
    if (status) { 
      where.push('status = ?'); 
      params.push(status) 
    }
    if (type) { 
      where.push('type = ?'); 
      params.push(type) 
    }
    if (location) { 
      where.push('location LIKE ?'); 
      params.push(`%${location}%`) 
    }
    if (search) { 
      where.push('MATCH(title, description, location) AGAINST(? IN BOOLEAN MODE)'); 
      params.push(search) 
    }
    
    const validSortFields = ['created_at', 'updated_at', 'title', 'type', 'status', 'closing_date']
    const validSortOrders = ['ASC', 'DESC']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    const sortDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC'
    
    const sql = `
      SELECT o.id, o.title, o.type, o.status, o.location, o.closing_date AS closingDate, 
             o.created_at AS createdAt, o.updated_at AS updatedAt,
             u.name AS postedByName
      FROM opportunities o
      LEFT JOIN users u ON o.posted_by = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY o.${sortField} ${sortDirection}
      LIMIT ? OFFSET ?
    `
    
    params.push(Number(limit), Number(offset))
    const [rows] = await pool.query(sql, params)
    
    // Get total count for pagination
    const countSql = `
      SELECT COUNT(*) as total
      FROM opportunities o
      WHERE ${where.join(' AND ')}
    `
    const [countResult] = await pool.query(countSql, params.slice(0, -2))
    
    res.json({ 
      items: rows,
      pagination: {
        total: countResult[0].total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < countResult[0].total
      }
    })
  } catch (err) {
    console.error('List opps error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create opportunity with audit trail
router.post('/', async (req, res) => {
  try {
    const { title, type, description, location, status, closingDate, postedBy } = req.body || {}
    if (!title) return res.status(400).json({ message: 'Title is required' })
    
    const oppType = ['internship','job','research','other'].includes(type) ? type : 'other'
    const oppStatus = ['open','closed'].includes(status) ? status : 'open'
    
    const [result] = await pool.query(
      'INSERT INTO opportunities (title, type, description, location, status, closing_date, posted_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, oppType, description || null, location || null, oppStatus, closingDate || null, postedBy || null]
    )
    
    // Log audit trail
    await pool.query(
      'INSERT INTO opportunity_audit (opportunity_id, action, changed_by, new_values) VALUES (?, ?, ?, ?)',
      [result.insertId, 'created', postedBy || null, JSON.stringify({ title, type: oppType, description, location, status: oppStatus, closingDate })]
    )
    
    res.status(201).json({ id: result.insertId })
  } catch (err) {
    console.error('Create opp error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Read one opportunity
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [rows] = await pool.query(
      `SELECT o.*, u.name AS postedByName
       FROM opportunities o
       LEFT JOIN users u ON o.posted_by = u.id
       WHERE o.id = ? AND o.deleted_at IS NULL LIMIT 1`, 
      [id]
    )
    
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (err) {
    console.error('Get opp error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update opportunity with audit trail
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { title, type, description, location, status, closingDate, updatedBy } = req.body || {}
    
    // Get current values for audit
    const [currentRows] = await pool.query(
      'SELECT title, type, description, location, status, closing_date FROM opportunities WHERE id = ? AND deleted_at IS NULL',
      [id]
    )
    
    if (!currentRows || currentRows.length === 0) {
      return res.status(404).json({ message: 'Opportunity not found' })
    }
    
    const current = currentRows[0]
    const oppType = type && ['internship','job','research','other'].includes(type) ? type : undefined
    const oppStatus = status && ['open','closed'].includes(status) ? status : undefined
    
    const fields = []
    const params = []
    const newValues = {}
    
    if (title !== undefined) { 
      fields.push('title = ?'); 
      params.push(title)
      newValues.title = title
    }
    if (oppType !== undefined) { 
      fields.push('type = ?'); 
      params.push(oppType)
      newValues.type = oppType
    }
    if (description !== undefined) { 
      fields.push('description = ?'); 
      params.push(description)
      newValues.description = description
    }
    if (location !== undefined) { 
      fields.push('location = ?'); 
      params.push(location)
      newValues.location = location
    }
    if (oppStatus !== undefined) { 
      fields.push('status = ?'); 
      params.push(oppStatus)
      newValues.status = oppStatus
    }
    if (closingDate !== undefined) { 
      fields.push('closing_date = ?'); 
      params.push(closingDate)
      newValues.closingDate = closingDate
    }
    
    if (fields.length === 0) return res.status(400).json({ message: 'No changes provided' })
    
    params.push(id)
    const sql = `UPDATE opportunities SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`
    await pool.query(sql, params)
    
    // Log audit trail
    await pool.query(
      'INSERT INTO opportunity_audit (opportunity_id, action, changed_by, old_values, new_values) VALUES (?, ?, ?, ?, ?)',
      [id, 'updated', updatedBy || null, JSON.stringify(current), JSON.stringify(newValues)]
    )
    
    res.json({ message: 'Updated' })
  } catch (err) {
    console.error('Update opp error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Soft delete opportunity
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { deletedBy } = req.body || {}
    
    const [result] = await pool.query(
      'UPDATE opportunities SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [id]
    )
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Opportunity not found or already deleted' })
    }
    
    // Log audit trail
    await pool.query(
      'INSERT INTO opportunity_audit (opportunity_id, action, changed_by) VALUES (?, ?, ?)',
      [id, 'deleted', deletedBy || null]
    )
    
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error('Delete opp error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get opportunity audit trail
router.get('/:id/audit', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [rows] = await pool.query(
      `SELECT a.*, u.name AS changedByName
       FROM opportunity_audit a
       LEFT JOIN users u ON a.changed_by = u.id
       WHERE a.opportunity_id = ?
       ORDER BY a.created_at DESC`,
      [id]
    )
    
    res.json({ audit: rows })
  } catch (err) {
    console.error('Get audit error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router


