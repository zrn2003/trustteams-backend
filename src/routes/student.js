import express from 'express'
import pool from '../db.js'

const router = express.Router()

async function ensureProfileTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_profiles (
      user_id INT PRIMARY KEY,
      github_url VARCHAR(512) NULL,
      linkedin_url VARCHAR(512) NULL,
      website_url VARCHAR(512) NULL,
      resume_url VARCHAR(512) NULL,
      summary TEXT NULL,
      skills JSON NULL,
      experiences JSON NULL,
      education JSON NULL,
      projects JSON NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_student_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
}

// Get current student's profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    if (!userId) {
      return res.status(401).json({ message: 'User ID required' })
    }

    await ensureProfileTable()

    const [rows] = await pool.query(
      'SELECT * FROM student_profiles WHERE user_id = ?',
      [userId]
    )

    if (rows.length === 0) {
      // Seed an empty profile
      await pool.query(
        'INSERT INTO student_profiles (user_id, skills, experiences, education, projects) VALUES (?, ?, ?, ?, ?)',
        [userId, JSON.stringify([]), JSON.stringify([]), JSON.stringify([]), JSON.stringify([])]
      )
      const [fresh] = await pool.query(
        'SELECT * FROM student_profiles WHERE user_id = ?',
        [userId]
      )
      return res.json({ profile: normalizeProfile(fresh[0]) })
    }

    return res.json({ profile: normalizeProfile(rows[0]) })
  } catch (err) {
    console.error('Get student profile error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

// Update current student's profile
router.put('/profile', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    if (!userId) {
      return res.status(401).json({ message: 'User ID required' })
    }

    await ensureProfileTable()

    const {
      githubUrl,
      linkedinUrl,
      websiteUrl,
      resumeUrl,
      summary,
      skills = [],
      experiences = [],
      education = [],
      projects = []
    } = req.body || {}

    // Upsert
    await pool.query(
      `INSERT INTO student_profiles (user_id, github_url, linkedin_url, website_url, resume_url, summary, skills, experiences, education, projects, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         github_url = VALUES(github_url),
         linkedin_url = VALUES(linkedin_url),
         website_url = VALUES(website_url),
         resume_url = VALUES(resume_url),
         summary = VALUES(summary),
         skills = VALUES(skills),
         experiences = VALUES(experiences),
         education = VALUES(education),
         projects = VALUES(projects),
         updated_at = NOW()`,
      [
        userId,
        nullable(githubUrl),
        nullable(linkedinUrl),
        nullable(websiteUrl),
        nullable(resumeUrl),
        nullable(summary),
        JSON.stringify(skills || []),
        JSON.stringify(experiences || []),
        JSON.stringify(education || []),
        JSON.stringify(projects || [])
      ]
    )

    const [rows] = await pool.query(
      'SELECT * FROM student_profiles WHERE user_id = ?',
      [userId]
    )

    return res.json({ message: 'Profile updated', profile: normalizeProfile(rows[0]) })
  } catch (err) {
    console.error('Update student profile error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

function nullable(v) {
  return v === undefined ? null : v
}

function normalizeProfile(row) {
  if (!row) return null
  return {
    userId: row.user_id,
    githubUrl: row.github_url || '',
    linkedinUrl: row.linkedin_url || '',
    websiteUrl: row.website_url || '',
    resumeUrl: row.resume_url || '',
    summary: row.summary || '',
    skills: safeParse(row.skills, []),
    experiences: safeParse(row.experiences, []),
    education: safeParse(row.education, []),
    projects: safeParse(row.projects, []),
    updatedAt: row.updated_at,
    createdAt: row.created_at
  }
}

function safeParse(maybeJson, fallback) {
  try {
    if (typeof maybeJson === 'string') return JSON.parse(maybeJson)
    return maybeJson ?? fallback
  } catch {
    return fallback
  }
}

export default router
