import express from 'express'
import pool from '../db.js'

const router = express.Router()

router.post('/fix-role-enum', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`
    )
    const colType = rows?.[0]?.COLUMN_TYPE || ''
    const needsUpdate = !/enum\(/i.test(colType) || !/\b'student'\b/.test(colType)

    if (needsUpdate) {
      await pool.query(
        "ALTER TABLE users MODIFY role ENUM('admin','manager','viewer','student') NOT NULL DEFAULT 'student'"
      )
      return res.json({ updated: true })
    }

    return res.json({ updated: false, message: "ENUM already includes 'student'" })
  } catch (e) {
    console.error('fix-role-enum error:', e)
    return res.status(500).json({ message: 'Failed to update ENUM', error: e?.message })
  }
})

export default router
