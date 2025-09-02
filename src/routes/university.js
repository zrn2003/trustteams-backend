import express from 'express'
import pool from '../db.js'

const router = express.Router()

// Simple guard: university_admin, admin, academic_leader, or manager (for protected routes)
const requireAuth = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id']
    console.log('🔐 requireAuth called for user ID:', userId)
    
    if (!userId) {
      console.log('❌ No user ID provided')
      return res.status(401).json({ message: 'User ID required' })
    }
    
    const [rows] = await pool.query('SELECT id, role, email, university_id FROM users WHERE id = ?', [userId])
    console.log('🔍 Database query result:', { userId, rowsFound: rows.length, userData: rows[0] })
    
    if (rows.length === 0) {
      console.log('❌ User not found in database')
      return res.status(401).json({ message: 'Invalid user' })
    }
    
    const me = rows[0]
    console.log('✅ User found:', { id: me.id, role: me.role, email: me.email })
    
    if (me.role !== 'university_admin' && me.role !== 'admin' && me.role !== 'academic_leader' && me.role !== 'manager') {
      console.log('❌ User role not allowed:', me.role)
      return res.status(403).json({ message: 'Forbidden - Role not allowed' })
    }
    
    console.log('✅ User authorized, role:', me.role)
    req.currentUser = me
    next()
  } catch (e) {
    console.error('❌ university auth error', e)
    return res.status(500).json({ message: 'Server error' })
  }
}

function domainOf(email) {
  return (email || '').split('@')[1]?.toLowerCase() || ''
}

// Public endpoint - Get all universities (no auth required)
router.get('/universities', async (req, res) => {
  try {
    const [universities] = await pool.query(
      'SELECT id, name, domain, address, website, contact_email, contact_phone, established_year, is_active FROM universities WHERE is_active = true ORDER BY name'
    )
    
    return res.json({ universities })
  } catch (error) {
    console.error('Get universities error:', error)
    
    // Return mock data if database is not available
    const mockUniversities = [
      {
        id: 1,
        name: "Massachusetts Institute of Technology",
        domain: "mit.edu",
        address: "77 Massachusetts Ave, Cambridge, MA 02139",
        website: "https://mit.edu",
        contact_email: "admissions@mit.edu",
        contact_phone: "+1-617-253-1000",
        established_year: 1861,
        is_active: true
      },
      {
        id: 2,
        name: "Stanford University",
        domain: "stanford.edu",
        address: "450 Serra Mall, Stanford, CA 94305",
        website: "https://stanford.edu",
        contact_email: "admissions@stanford.edu",
        contact_phone: "+1-650-723-2300",
        established_year: 1885,
        is_active: true
      },
      {
        id: 3,
        name: "Harvard University",
        domain: "harvard.edu",
        address: "Cambridge, MA 02138",
        website: "https://harvard.edu",
        contact_email: "admissions@harvard.edu",
        contact_phone: "+1-617-495-1000",
        established_year: 1636,
        is_active: true
      },
      {
        id: 4,
        name: "University of California, Berkeley",
        domain: "berkeley.edu",
        address: "Berkeley, CA 94720",
        website: "https://berkeley.edu",
        contact_email: "admissions@berkeley.edu",
        contact_phone: "+1-510-642-6000",
        established_year: 1868,
        is_active: true
      },
      {
        id: 5,
        name: "Carnegie Mellon University",
        domain: "cmu.edu",
        address: "5000 Forbes Ave, Pittsburgh, PA 15213",
        website: "https://cmu.edu",
        contact_email: "admissions@cmu.edu",
        contact_phone: "+1-412-268-2000",
        established_year: 1900,
        is_active: true
      }
    ]
    
    console.log('Returning mock universities data due to database error')
    return res.json({ universities: mockUniversities })
  }
})

// Apply auth middleware to protected routes
router.use(requireAuth)

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
    const userId = req.headers['x-user-id']
    
    // Get current user's university_id
    const [currentUser] = await pool.query(
      'SELECT university_id FROM users WHERE id = ?',
      [userId]
    )
    
    const universityId = currentUser[0]?.university_id || 1
    
    // Get students for this university
    const [students] = await pool.query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.approval_status,
        rr.institute_name
      FROM users u
      LEFT JOIN registration_requests rr ON u.id = rr.user_id
      WHERE u.university_id = ? AND u.role = ?
      ORDER BY u.created_at DESC`,
      [universityId, 'student']
    )
    
    // Get academic leaders for this university
    const [academicLeaders] = await pool.query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.approval_status,
        rr.institute_name
      FROM users u
      LEFT JOIN registration_requests rr ON u.id = rr.user_id
      WHERE u.university_id = ? AND u.role = ?
      ORDER BY u.created_at DESC`,
      [universityId, 'academic_leader']
    )
    
    return res.json({ 
      students: students || [],
      academicLeaders: academicLeaders || []
    })
  } catch (error) {
    console.error('Get students error:', error)
    return res.status(500).json({ message: 'Failed to fetch students' })
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



// Get university by domain
router.get('/universities/:domain', async (req, res) => {
  try {
    const { domain } = req.params
    
    const [universities] = await pool.query(
      'SELECT id, name, domain, address, website, contact_email, contact_phone, established_year, is_active FROM universities WHERE domain = ? AND is_active = true',
      [domain]
    )
    
    if (universities.length === 0) {
      return res.status(404).json({ message: 'University not found' })
    }
    
    return res.json({ university: universities[0] })
  } catch (error) {
    console.error('Get university error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

// Create new university (only by admin)
router.post('/universities', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    const { name, domain, address, website, contact_email, contact_phone, established_year } = req.body
    
    // Check if user is admin
    const [users] = await pool.query(
      'SELECT role FROM users WHERE id = ? AND role = ?',
      [userId, 'admin']
    )
    
    if (users.length === 0) {
      return res.status(403).json({ message: 'Only administrators can create universities' })
    }
    
    // Validate required fields
    if (!name || !domain) {
      return res.status(400).json({ message: 'University name and domain are required' })
    }
    
    // Check if university already exists
    const [existingUniversities] = await pool.query(
      'SELECT id FROM universities WHERE name = ? OR domain = ?',
      [name, domain]
    )
    
    if (existingUniversities.length > 0) {
      return res.status(400).json({ message: 'University with this name or domain already exists' })
    }
    
    // Create university
    const [result] = await pool.query(
      'INSERT INTO universities (name, domain, address, website, contact_email, contact_phone, established_year) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, domain, address, website, contact_email, contact_phone, established_year]
    )
    
    return res.status(201).json({
      message: 'University created successfully',
      university: {
        id: result.insertId,
        name,
        domain,
        address,
        website,
        contact_email,
        contact_phone,
        established_year
      }
    })
  } catch (error) {
    console.error('Create university error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

// Get university registration requests
router.get('/universities/:universityId/registration-requests', requireAuth, async (req, res) => {
  try {
    const { universityId } = req.params
    
    // Get only pending registration requests with user details
    const [requests] = await pool.query(
      `SELECT 
        rr.id,
        rr.user_id,
        rr.university_id,
        rr.institute_name,
        rr.role,
        rr.status,
        rr.created_at,
        rr.updated_at,
        u.name as user_name,
        u.email as user_email
      FROM registration_requests rr
      JOIN users u ON rr.user_id = u.id
      WHERE rr.university_id = ? AND rr.status = 'pending'
      ORDER BY rr.created_at DESC`,
      [universityId]
    )
    
    return res.json({ requests })
  } catch (error) {
    console.error('Get registration requests error:', error)
    return res.status(500).json({ message: 'Failed to fetch registration requests' })
  }
})

// Approve or reject registration request
router.put('/registration-requests/:requestId', requireAuth, async (req, res) => {
  try {
    console.log('Registration request update called:', {
      requestId: req.params.requestId,
      body: req.body,
      userId: req.headers['x-user-id']
    });
    
    const userId = req.headers['x-user-id']
    const { requestId } = req.params
    const { action, rejection_reason } = req.body // action: 'approve' or 'reject'
    
    if (!['approve', 'reject'].includes(action)) {
      console.log('Invalid action:', action);
      return res.status(400).json({ message: 'Action must be either "approve" or "reject"' })
    }
    
    console.log('Getting registration request for ID:', requestId);
    
    // Get the registration request
    const [requests] = await pool.query(
      `SELECT 
        rr.*,
        u.role as user_role
      FROM registration_requests rr
      JOIN users u ON rr.user_id = u.id
      WHERE rr.id = ?`,
      [requestId]
    )
    
    console.log('Registration request query result:', requests);
    
    if (requests.length === 0) {
      console.log('Registration request not found for ID:', requestId);
      return res.status(404).json({ message: 'Registration request not found' })
    }
    
    const request = requests[0]
    console.log('Found registration request:', request);
    
    // Check if user has permission to approve this request
    // Allow any authenticated user to approve requests for now
    console.log('Checking user permissions for user:', userId);
    const [currentUser] = await pool.query(
      'SELECT id, name, email, role, university_id FROM users WHERE id = ?',
      [userId]
    )
    
    if (currentUser.length === 0) {
      console.log('Current user not found');
      return res.status(404).json({ message: 'User not found' })
    }
    
    console.log('Current user:', currentUser[0]);
    
    const status = action === 'approve' ? 'approved' : 'rejected'
    const approvedAt = action === 'approve' ? new Date() : null
    
    console.log('Updating registration request with status:', status);
    
    // Update registration request
    await pool.query(
      'UPDATE registration_requests SET status = ?, approved_by = ?, approved_at = ?, rejection_reason = ? WHERE id = ?',
      [status, userId, approvedAt, rejection_reason, requestId]
    )
    
    console.log('Updating user approval status for user:', request.user_id);
    
    // Update user approval status and is_active
    const isActive = action === 'approve' ? true : false;
    await pool.query(
      'UPDATE users SET approval_status = ?, approved_by = ?, approved_at = ?, rejection_reason = ?, is_active = ? WHERE id = ?',
      [status, userId, approvedAt, rejection_reason, isActive, request.user_id]
    )
    
    console.log('Registration request updated successfully');
    
    return res.json({
      message: `Registration request ${action}d successfully`,
      status
    })
  } catch (error) {
    console.error('Update registration request error:', error)
    console.error('Error stack:', error.stack)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

// Get university statistics
router.get('/universities/:universityId/stats', async (req, res) => {
  try {
    const { universityId } = req.params
    
    // Get user counts by role from users table
    const [userStats] = await pool.query(
      `SELECT 
        role,
        COUNT(*) as total_count,
        SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
      FROM users 
      WHERE university_id = ? AND role IN ('student', 'academic_leader')
      GROUP BY role`,
      [universityId]
    )
    
    // Get registration requests count
    const [registrationRequests] = await pool.query(
      `SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_requests
      FROM registration_requests 
      WHERE university_id = ?`,
      [universityId]
    )
    
    // Calculate totals for frontend
    let totalStudents = 0
    let totalAcademicLeaders = 0
    let pendingRequests = registrationRequests[0]?.pending_requests || 0
    
    userStats.forEach(stat => {
      if (stat.role === 'student') {
        totalStudents = stat.approved_count || 0
      } else if (stat.role === 'academic_leader') {
        totalAcademicLeaders = stat.approved_count || 0
      }
    })
    
    // Return the structure that frontend expects
    return res.json({
      totalStudents,
      totalAcademicLeaders,
      pendingRequests,
      activePrograms: 5 // Default value, can be enhanced later
    })
  } catch (error) {
    console.error('Get university stats error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

// Get user profile
router.get('/users/:userId/profile', requireAuth, async (req, res) => {
  try {
    console.log('📋 GET profile called for user ID:', req.params.userId)
    console.log('👤 Current user from requireAuth:', req.currentUser)
    
    const { userId } = req.params
    const currentUser = req.currentUser
    
    console.log('Getting user profile:', { 
      userId, 
      currentUserId: currentUser.id, 
      currentUserRole: currentUser.role,
      userIdType: typeof userId,
      currentUserIdType: typeof currentUser.id,
      userIdParsed: parseInt(userId),
      isEqual: currentUser.id === parseInt(userId)
    })
    
    // Get basic user information from users table
    const [userRows] = await pool.query(
      'SELECT id, name, email, role, university_id, approval_status, is_active, created_at, last_login, institute_name FROM users WHERE id = ?',
      [userId]
    )
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    const user = userRows[0]
    
    // Authorization check: Users can view their own profile, university admins can view users from their university
    console.log('Authorization check:', {
      currentUserId: currentUser.id,
      targetUserId: userId,
      currentUserRole: currentUser.role,
      isOwnProfile: currentUser.id === parseInt(userId),
      userIdFromHeader: req.headers['x-user-id']
    })
    
    if (currentUser.id === parseInt(userId)) {
      console.log('User viewing own profile - authorized')
    } else if (currentUser.role === 'university_admin') {
      console.log('University admin authorization check:', {
        currentUserUniversityId: currentUser.university_id,
        targetUserUniversityId: user.university_id,
        isSameUniversity: currentUser.university_id === user.university_id
      })
      
      if (currentUser.university_id !== user.university_id) {
        console.log('Unauthorized access attempt:', { 
          currentUserUniversityId: currentUser.university_id, 
          targetUserUniversityId: user.university_id 
        })
        return res.status(403).json({ message: 'Unauthorized to view this user profile' })
      }
    } else if (currentUser.role === 'icm') {
      // ICM users can view their own profile
      if (currentUser.id === parseInt(userId)) {
        console.log('ICM user viewing own profile - authorized')
      } else {
        console.log('ICM user attempting to view other user profile - unauthorized')
        return res.status(403).json({ message: 'ICM users can only view their own profile' })
      }
    } else {
      console.log('Unauthorized access attempt - user not viewing own profile and not university admin or ICM')
      return res.status(403).json({ message: 'Unauthorized to view this user profile' })
    }
    
    // Users can always view their own profile
    if (currentUser.id === parseInt(userId)) {
      console.log('User viewing own profile')
    } else {
      console.log('User viewing other user profile:', { viewer: currentUser.id, target: userId })
    }
    
    // Get university information if user has university_id
    let university = null
    if (user.university_id) {
      const [universityRows] = await pool.query(
        'SELECT name, domain FROM universities WHERE id = ?',
        [user.university_id]
      )
      if (universityRows.length > 0) {
        university = universityRows[0]
      }
    }
    
    // Create a comprehensive profile with available data
    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      university_id: user.university_id,
      approval_status: user.approval_status,
      is_active: user.is_active,
      department: university ? university.name : 'University Administration',
      position: user.role === 'university_admin' ? 'University Administrator' : 
               user.role === 'academic_leader' ? 'Academic Leader' : 
               user.role === 'student' ? 'Student' : 'Staff Member',
      phone: 'Not specified',
      address: 'Not specified',
      join_date: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      experience_years: 1,
      education: 'Not specified',
      specialization: 'Not specified',
      bio: `${user.name} is a ${user.role} at ${university ? university.name : 'the university'}.`,
      emergency_contact: {
        name: 'Not specified',
        relationship: 'Not specified',
        phone: 'Not specified'
      },
      permissions: ['basic_access'],
      // Additional fields for university admin view
      registration_date: user.created_at,
      last_login: user.last_login,
      university_name: university ? university.name : 'Not specified',
      university_domain: university ? university.domain : 'Not specified'
    }
    
    // Try to get additional user data if the tables exist
    try {
      // Check if additional user fields exist
      const [extendedUserRows] = await pool.query(
        'SELECT phone, department, position, join_date, experience_years, education, specialization, bio, address, years_experience, highest_degree, field_of_study, institution, completion_year, research_papers, research_areas, publications, projects_completed, current_projects, project_experience FROM users WHERE id = ?',
        [userId]
      )
      
      if (extendedUserRows.length > 0) {
        const extendedUser = extendedUserRows[0]
        if (extendedUser.phone) profile.phone = extendedUser.phone
        if (extendedUser.department) profile.department = extendedUser.department
        if (extendedUser.position) profile.position = extendedUser.position
        if (extendedUser.join_date) profile.join_date = extendedUser.join_date
        if (extendedUser.experience_years) profile.experience_years = extendedUser.experience_years
        if (extendedUser.education) profile.education = extendedUser.education
        if (extendedUser.specialization) profile.specialization = extendedUser.specialization
        if (extendedUser.bio) profile.bio = extendedUser.bio
        if (extendedUser.address) profile.address = extendedUser.address
        
        // Add new academic fields
        if (extendedUser.years_experience) profile.years_experience = extendedUser.years_experience
        if (extendedUser.highest_degree) profile.highest_degree = extendedUser.highest_degree
        if (extendedUser.field_of_study) profile.field_of_study = extendedUser.field_of_study
        if (extendedUser.institution) profile.institution = extendedUser.institution
        if (extendedUser.completion_year) profile.completion_year = extendedUser.completion_year
        if (extendedUser.research_papers) profile.research_papers = extendedUser.research_papers
        if (extendedUser.research_areas) profile.research_areas = extendedUser.research_areas
        if (extendedUser.publications) profile.publications = extendedUser.publications
        if (extendedUser.projects_completed) profile.projects_completed = extendedUser.projects_completed
        if (extendedUser.current_projects) profile.current_projects = extendedUser.current_projects
        if (extendedUser.project_experience) profile.project_experience = extendedUser.project_experience
      }
    } catch (tableError) {
      console.log('Extended user fields not available, using basic profile')
    }
    
    // Try to get emergency contact if table exists
    try {
      const [emergencyRows] = await pool.query(
        'SELECT name, relationship, phone FROM emergency_contacts WHERE user_id = ?',
        [userId]
      )
      
      if (emergencyRows.length > 0) {
        profile.emergency_contact = emergencyRows[0]
      }
    } catch (tableError) {
      console.log('Emergency contacts table not available')
    }

    // Get comprehensive profile data (education, experience, skills, projects)
    try {
      // Get user's education
      const [educationRows] = await pool.query(
        'SELECT * FROM user_education WHERE user_id = ? ORDER BY start_date DESC',
        [userId]
      )
      profile.education_details = educationRows

      // Get user's experience
      const [experienceRows] = await pool.query(
        'SELECT * FROM user_experience WHERE user_id = ? ORDER BY start_date DESC',
        [userId]
      )
      profile.experience_details = experienceRows

      // Get user's skills
      const [skillsRows] = await pool.query(
        'SELECT * FROM user_skills WHERE user_id = ? ORDER BY skill_category, proficiency_level DESC',
        [userId]
      )
      profile.skills_details = skillsRows

      // Get user's projects
      const [projectsRows] = await pool.query(
        'SELECT * FROM user_projects WHERE user_id = ? ORDER BY start_date DESC',
        [userId]
      )
      profile.projects_details = projectsRows

      console.log('Comprehensive profile data fetched:', {
        education_count: educationRows.length,
        experience_count: experienceRows.length,
        skills_count: skillsRows.length,
        projects_count: projectsRows.length
      })
    } catch (profileError) {
      console.log('Comprehensive profile tables not available:', profileError.message)
      profile.education_details = []
      profile.experience_details = []
      profile.skills_details = []
      profile.projects_details = []
    }
    
    // Try to get user permissions if table exists
    try {
      const [permissionRows] = await pool.query(
        'SELECT permission FROM user_permissions WHERE user_id = ?',
        [userId]
      )
      
      if (permissionRows.length > 0) {
        profile.permissions = permissionRows.map(row => row.permission)
      }
    } catch (tableError) {
      console.log('User permissions table not available')
    }
    
    console.log('Profile generated successfully:', { userId, profileId: profile.id, profileName: profile.name })
    return res.json(profile)
  } catch (error) {
    console.error('Get user profile error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: req.params.userId,
      currentUser: req.currentUser
    })
    return res.status(500).json({ 
      message: 'Failed to fetch user profile',
      details: error.message 
    })
  }
})

// Update user profile
router.put('/users/:userId/profile', requireAuth, async (req, res) => {
  try {
    console.log('📝 PUT profile called for user ID:', req.params.userId)
    console.log('👤 Current user from requireAuth:', req.currentUser)
    
    const { userId } = req.params
    const currentUser = req.currentUser
    
    console.log('Updating user profile:', { 
      userId, 
      currentUserId: currentUser.id, 
      currentUserRole: currentUser.role,
      userIdType: typeof userId,
      currentUserIdType: typeof currentUser.id,
      userIdParsed: parseInt(userId),
      isEqual: currentUser.id === parseInt(userId),
      name: req.body.name, 
      email: req.body.email
    })
    
    // Authorization check: Users can only update their own profile
    if (currentUser.id !== parseInt(userId)) {
      console.log('Unauthorized profile update attempt:', { 
        currentUserId: currentUser.id, 
        targetUserId: userId 
      })
      return res.status(403).json({ message: 'You can only update your own profile' })
    }
    
    const { 
      name, email
    } = req.body
    
    // Update user basic information (only fields that exist in the database)
    const [result] = await pool.query(
      `UPDATE users 
       SET name = ?, email = ?, updated_at = NOW()
       WHERE id = ?`,
      [name, email, userId]
    )
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    // Fetch updated profile with existing fields
    const [updatedUser] = await pool.query(
      `SELECT id, name, email, role, university_id, approval_status, is_active, created_at, updated_at, last_login, institute_name
       FROM users WHERE id = ?`,
      [userId]
    )
    
    console.log('Profile updated successfully:', updatedUser[0])
    
    return res.json(updatedUser[0])
  } catch (error) {
    console.error('Update user profile error:', error)
    return res.status(500).json({ message: 'Failed to update user profile' })
  }
})

// Get university profile
router.get('/universities/:universityId/profile', requireAuth, async (req, res) => {
  try {
    const { universityId } = req.params
    
    // Get university information
    const [universityRows] = await pool.query(
      'SELECT id, name, domain, address, website, contact_email, contact_phone, established_year, is_active FROM universities WHERE id = ?',
      [universityId]
    )
    
    if (universityRows.length === 0) {
      return res.status(404).json({ message: 'University not found' })
    }
    
    const university = universityRows[0]
    
    // Get university statistics from users table
    const [userStats] = await pool.query(
      `SELECT 
        role,
        COUNT(*) as total_count,
        SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) as approved_count
      FROM users 
      WHERE university_id = ? AND role IN ('student', 'academic_leader')
      GROUP BY role`,
      [universityId]
    )
    
    // Get registration requests
    const [registrationRequests] = await pool.query(
      `SELECT 
        rr.id,
        rr.status,
        rr.created_at,
        rr.role,
        u.name as user_name,
        u.email as user_email,
        rr.institute_name
      FROM registration_requests rr
      JOIN users u ON rr.user_id = u.id
      WHERE rr.university_id = ? AND rr.status = 'pending'
      ORDER BY rr.created_at DESC`,
      [universityId]
    )
    
    // Calculate totals
    let totalStudents = 0
    let totalAcademicLeaders = 0
    let pendingRequests = registrationRequests.length
    
    userStats.forEach(stat => {
      if (stat.role === 'student') {
        totalStudents = stat.approved_count || 0
      } else if (stat.role === 'academic_leader') {
        totalAcademicLeaders = stat.approved_count || 0
      }
    })
    
    // Get active programs count (placeholder - can be enhanced later)
    const activePrograms = 5 // Default value
    
    const profile = {
      ...university,
      stats: {
        totalStudents,
        totalAcademicLeaders,
        pendingRequests,
        activePrograms
      },
      requests: registrationRequests
    }
    
    return res.json(profile)
  } catch (error) {
    console.error('Get university profile error:', error)
    return res.status(500).json({ message: 'Failed to fetch university profile' })
  }
})

// Debug endpoint to check user permissions
router.get('/debug/user-info', requireAuth, async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    
    console.log('Debug user info request for user ID:', userId);
    
    if (!userId) {
      return res.status(400).json({ message: 'No user ID provided' })
    }
    
    // Get user information
    const [users] = await pool.query(
      'SELECT id, name, email, role, university_id, approval_status FROM users WHERE id = ?',
      [userId]
    )
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    const user = users[0]
    
    // Get university information if user has university_id
    let university = null
    if (user.university_id) {
      const [universities] = await pool.query(
        'SELECT id, name, domain FROM universities WHERE id = ?',
        [user.university_id]
      )
      if (universities.length > 0) {
        university = universities[0]
      }
    }
    
    // Get registration requests for this university
    let registrationRequests = []
    if (user.university_id) {
      const [requests] = await pool.query(
        'SELECT id, user_id, university_id, institute_name, role, status FROM registration_requests WHERE university_id = ?',
        [user.university_id]
      )
      registrationRequests = requests
    }
    
    return res.json({
      user,
      university,
      registrationRequests,
      isUniversityAdmin: user.role === 'university_admin',
      hasUniversityId: !!user.university_id
    })
  } catch (error) {
    console.error('Debug user info error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

// Delete user
router.delete('/users/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params
    const currentUser = req.currentUser
    
    console.log('Deleting user:', { userId, currentUserId: currentUser.id, currentUserRole: currentUser.role })
    
    // Check if user exists and get their details
    const [userToDelete] = await pool.query(
      'SELECT id, name, email, role, university_id FROM users WHERE id = ?',
      [userId]
    )
    
    if (userToDelete.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    const user = userToDelete[0]
    
    // Only university admins can delete users from their university
    if (currentUser.role !== 'university_admin' || currentUser.university_id !== user.university_id) {
      return res.status(403).json({ message: 'Unauthorized to delete this user' })
    }
    
    // Don't allow deleting other university admins
    if (user.role === 'university_admin') {
      return res.status(403).json({ message: 'Cannot delete university administrators' })
    }
    
    // Don't allow deleting yourself
    if (user.id === currentUser.id) {
      return res.status(403).json({ message: 'Cannot delete your own account' })
    }
    
    // Delete related records first (registration requests, etc.)
    await pool.query('DELETE FROM registration_requests WHERE user_id = ?', [userId])
    
    // Delete the user
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId])
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    console.log('User deleted successfully:', { userId, userName: user.name })
    
    return res.json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return res.status(500).json({ message: 'Failed to delete user' })
  }
})

export default router
