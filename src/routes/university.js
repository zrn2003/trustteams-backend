import express from 'express'
import pool from '../db.js'

const router = express.Router()

// Simple guard: university_admin or admin
router.use(async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id']
    if (!userId) return res.status(401).json({ message: 'User ID required' })
    const [rows] = await pool.query('SELECT id, role, email FROM users WHERE id = ?', [userId])
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid user' })
    const me = rows[0]
    if (me.role !== 'university_admin' && me.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    req.currentUser = me
    next()
  } catch (e) {
    console.error('university auth error', e)
    return res.status(500).json({ message: 'Server error' })
  }
})

function domainOf(email) {
  return (email || '').split('@')[1]?.toLowerCase() || ''
}

// GET /api/university/stats
router.get('/stats', async (req, res) => {
  try {
    const dom = domainOf(req.currentUser.email)
    // Students in same domain
    const [students] = await pool.query(
      "SELECT COUNT(*) as c FROM users WHERE role='student' AND SUBSTRING_INDEX(email, '@', -1)=?",
      [dom]
    )
    // Faculty placeholder (no schema) - count of managers as faculty surrogate
    const [faculty] = await pool.query(
      "SELECT COUNT(*) as c FROM users WHERE role IN ('manager') AND SUBSTRING_INDEX(email, '@', -1)=?",
      [dom]
    )
    // Courses placeholder (not in schema)
    const courses = 0
    // Budget placeholder
    const budget = 2.4

    return res.json({
      students: students[0]?.c || 0,
      faculty: faculty[0]?.c || 0,
      courses,
      budget,
      studentsTrend: 0,
      budgetTrend: 0
    })
  } catch (e) {
    console.error('stats error', e)
    return res.status(500).json({ message: 'Failed to get stats' })
  }
})

// GET /api/university/students
router.get('/students', async (req, res) => {
  try {
    const dom = domainOf(req.currentUser.email)
    let [rows] = await pool.query(
      `SELECT id, name, email, created_at
       FROM users
       WHERE role='student' AND SUBSTRING_INDEX(email, '@', -1)=?
       ORDER BY created_at DESC
       LIMIT 500`,
      [dom]
    )
    // If none in same domain or user is admin, fallback to global recent students
    if (rows.length === 0 || req.currentUser.role === 'admin') {
      const [allRows] = await pool.query(
        `SELECT id, name, email, created_at FROM users WHERE role='student' ORDER BY created_at DESC LIMIT 500`
      )
      rows = allRows
    }
    const enriched = rows.map((r, idx) => ({
      ...r,
      program: ['B.Tech','MBA','PhD'][idx % 3],
      year: 1 + (idx % 4),
      semester: 1 + (idx % 2),
      performance: 60 + (idx % 30),
      status: ['active','alumni','dropout'][idx % 3]
    }))
    return res.json({ students: enriched })
  } catch (e) {
    console.error('students error', e)
    return res.status(500).json({ message: 'Failed to list students' })
  }
})

// GET /api/university/departments
router.get('/departments', async (req, res) => {
  try {
    // Placeholder departments; in real app join departments table
    const depts = ['Engineering','Business','Sciences','Arts'].map((name, i) => ({
      id: i+1,
      name,
      hod: `Dr. ${name} Head`,
      facultyCount: 120 + i*5,
      studentCount: 2500 + i*200
    }))
    return res.json({ departments: depts })
  } catch (e) {
    console.error('departments error', e)
    return res.status(500).json({ message: 'Failed to get departments' })
  }
})

// GET /api/university/courses
router.get('/courses', async (req, res) => {
  try {
    const courses = Array.from({ length: 8 }).map((_, i) => ({
      id: i+1,
      title: `Course ${i+1}`,
      department: ['Engineering','Business','Sciences','Arts'][i % 4],
      credits: 3 + (i % 3),
      enrollment: 80 + i*12,
      status: i % 5 === 0 ? 'archived' : 'active'
    }))
    return res.json({ courses })
  } catch (e) {
    console.error('courses error', e)
    return res.status(500).json({ message: 'Failed to get courses' })
  }
})

// GET /api/university/finance
router.get('/finance', async (req, res) => {
  try {
    // Basic breakdown for charts
    const breakdown = [
      { label: 'Departments', amount: 0.8 },
      { label: 'Research', amount: 0.5 },
      { label: 'Scholarships', amount: 0.3 },
      { label: 'Infrastructure', amount: 0.6 }
    ]
    const monthly = Array.from({ length: 12 }).map((_, i) => ({
      month: i+1,
      revenue: 1.2 + (i % 6) * 0.1,
      expenses: 1.0 + (i % 6) * 0.12
    }))
    const alerts = ['Over-budget: Research Dept this month']
    return res.json({ breakdown, monthly, alerts })
  } catch (e) {
    console.error('finance error', e)
    return res.status(500).json({ message: 'Failed to get finance' })
  }
})

// GET /api/university/reports
router.get('/reports', async (req, res) => {
  try {
    const reports = [
      { key: 'enrollment', title: 'Enrollment Growth', trend: 'up' },
      { key: 'dropout', title: 'Dropout Rate', trend: 'down' },
      { key: 'publications', title: 'Research Publications', value: 340 },
      { key: 'placements', title: 'Placement Stats', value: '92%' }
    ]
    const compliance = {
      checklist: [
        { label: 'Submit NAAC report', done: true },
        { label: 'Faculty appraisal forms', done: false },
        { label: 'Lab safety audit', done: false },
        { label: 'Fire drill compliance', done: false }
      ],
      milestones: [ { label: 'Accreditation cycle', progress: 0.7 } ]
    }
    return res.json({ reports, compliance })
  } catch (e) {
    console.error('reports error', e)
    return res.status(500).json({ message: 'Failed to get reports' })
  }
})

// GET /api/university/institutes
router.get('/institutes', async (req, res) => {
  try {
    // Aggregate by email domain as institute proxy
    const [rows] = await pool.query(
      `SELECT SUBSTRING_INDEX(email,'@',-1) AS domain,
              SUM(role='student') AS students,
              SUM(role IN ('manager','academic_leader','university_admin','admin')) AS staff
       FROM users
       GROUP BY domain
       HAVING domain IS NOT NULL AND domain != ''
       ORDER BY students DESC
       LIMIT 200`
    )
    const institutes = rows.map((r, i) => ({ id: i+1, name: r.domain, domain: r.domain, students: r.students, staff: r.staff }))
    return res.json({ institutes })
  } catch (e) {
    console.error('institutes error', e)
    return res.status(500).json({ message: 'Failed to get institutes' })
  }
})

// GET /api/university/institutes/:domain
router.get('/institutes/:domain', async (req, res) => {
  try {
    const domain = (req.params.domain || '').toLowerCase()
    if (!domain) return res.status(400).json({ message: 'Domain required' })

    const [[studentCount]] = await pool.query(
      "SELECT COUNT(*) as c FROM users WHERE role='student' AND SUBSTRING_INDEX(email,'@',-1)=?",
      [domain]
    )
    const [[staffCount]] = await pool.query(
      "SELECT COUNT(*) as c FROM users WHERE role IN ('manager','academic_leader','university_admin','admin') AND SUBSTRING_INDEX(email,'@',-1)=?",
      [domain]
    )

    const [studentRows] = await pool.query(
      `SELECT id, name, email, created_at FROM users WHERE role='student' AND SUBSTRING_INDEX(email,'@',-1)=? ORDER BY created_at DESC LIMIT 500`,
      [domain]
    )
    const students = studentRows.map((r, idx) => ({
      ...r,
      program: ['B.Tech','MBA','PhD'][idx % 3],
      year: 1 + (idx % 4),
      semester: 1 + (idx % 2),
      performance: 60 + (idx % 30),
      status: ['active','alumni','dropout'][idx % 3]
    }))

    // Placeholder structures for departments/faculty/finance until real schema exists
    const departments = ['Engineering','Business','Sciences','Arts'].map((name, i) => ({
      id: i+1, name, hod: `Dr. ${name} Head`, facultyCount: 120 + i*5, studentCount: 2500 + i*200
    }))
    const faculty = Array.from({ length: 12 }).map((_, i) => ({
      id: i+1, name: `Faculty ${i+1}`, specialization: ['AI','Finance','Biotech','Design'][i % 4], status: ['active','leave'][i % 2]
    }))
    const finance = {
      budgetAllocated: 1.2,
      budgetUsed: 0.9,
      breakdown: [
        { label: 'Departments', amount: 0.5 },
        { label: 'Research', amount: 0.3 },
        { label: 'Scholarships', amount: 0.2 }
      ]
    }

    const kpis = {
      students: studentCount?.c || 0,
      faculty: staffCount?.c || 0,
      departments: departments.length,
      researchGrants: 24,
      placementRate: '92%'
    }

    const institute = {
      domain,
      name: domain,
      dean: { name: 'Dr. Jane Doe', email: `dean@${domain}`, phone: '+1 555-0100' },
      accreditation: ['NAAC','NBA'],
      status: 'active'
    }

    return res.json({ institute, kpis, departments, students, faculty, finance })
  } catch (e) {
    console.error('institute detail error', e)
    return res.status(500).json({ message: 'Failed to get institute detail' })
  }
})

export default router
