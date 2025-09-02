import express from 'express'
import pool from '../db.js'

const router = express.Router()

// Simple guard: manager (Industrial Manager), admin, or university_admin (for protected routes)
const requireAuth = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id']
    if (!userId) return res.status(401).json({ message: 'User ID required' })
    const [rows] = await pool.query('SELECT id, role, email, university_id FROM users WHERE id = ?', [userId])
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid user' })
    const me = rows[0]
    if (me.role !== 'manager' && me.role !== 'admin' && me.role !== 'university_admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    req.currentUser = me
    next()
  } catch (e) {
    console.error('manager auth error', e)
    return res.status(500).json({ message: 'Server error' })
  }
}

// Get ICM universities
router.get('/universities', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, approval_status, created_at FROM users WHERE role = ? AND is_active = 1',
      ['university_admin']
    )
    res.json(rows)
  } catch (error) {
    console.error('Error fetching ICM universities:', error)
    res.status(500).json({ message: 'Failed to fetch universities' })
  }
})

// Get ICM opportunities
router.get('/opportunities', requireAuth, async (req, res) => {
  try {
    const userId = req.currentUser.id
    const [rows] = await pool.query(
      `SELECT o.*, u.name as postedByName 
       FROM opportunities o 
       JOIN users u ON o.posted_by = u.id 
       WHERE o.posted_by = ? 
       ORDER BY o.created_at DESC`,
      [userId]
    )
    res.json(rows)
  } catch (error) {
    console.error('Error fetching ICM opportunities:', error)
    res.status(500).json({ message: 'Failed to fetch opportunities' })
  }
})

// Get a specific opportunity for editing
router.get('/opportunities/:opportunityId', requireAuth, async (req, res) => {
  try {
    const userId = req.currentUser.id
    const opportunityId = req.params.opportunityId
    
    // Verify that this opportunity belongs to the current ICM user
    const [opportunity] = await pool.query(
      'SELECT * FROM opportunities WHERE id = ? AND posted_by = ?',
      [opportunityId, userId]
    )
    
    if (opportunity.length === 0) {
      return res.status(404).json({ message: 'Opportunity not found or access denied' })
    }
    
    res.json({
      success: true,
      opportunity: opportunity[0]
    })
  } catch (error) {
    console.error('Error fetching opportunity:', error)
    res.status(500).json({ message: 'Failed to fetch opportunity' })
  }
})

// Get applications for a specific opportunity
router.get('/opportunities/:opportunityId/applications', requireAuth, async (req, res) => {
  try {
    const userId = req.currentUser.id
    const opportunityId = req.params.opportunityId
    
    // First verify that this opportunity belongs to the current ICM user
    const [opportunityCheck] = await pool.query(
      'SELECT id FROM opportunities WHERE id = ? AND posted_by = ?',
      [opportunityId, userId]
    )
    
    if (opportunityCheck.length === 0) {
      return res.status(404).json({ message: 'Opportunity not found or access denied' })
    }
    
    // Get all applications for this opportunity
    const [applications] = await pool.query(
      `SELECT 
        oa.id,
        oa.opportunity_id,
        oa.student_id,
        oa.status,
        oa.cover_letter,
        oa.application_date,
        oa.updated_at,
        u.name as student_name,
        u.email as student_email,
        u.institute_name as university_name
       FROM opportunity_applications oa
       JOIN users u ON oa.student_id = u.id
       WHERE oa.opportunity_id = ?
       ORDER BY oa.application_date DESC`,
      [opportunityId]
    )
    
    res.json({
      success: true,
      applications: applications
    })
  } catch (error) {
    console.error('Error fetching opportunity applications:', error)
    res.status(500).json({ message: 'Failed to fetch applications' })
    }
})

// Get student profile for ICM review
router.get('/students/:studentId/profile', requireAuth, async (req, res) => {
  try {
    const studentId = req.params.studentId
    
    // Get basic student information
    const [studentInfo] = await pool.query(
      `SELECT 
        u.id, u.name, u.email, u.institute_name, u.phone, u.address, 
        u.position, u.department, u.bio, u.created_at
       FROM users u 
       WHERE u.id = ? AND u.role = 'student'`,
      [studentId]
    )
    
    if (studentInfo.length === 0) {
      return res.status(404).json({ message: 'Student not found' })
    }
    
    // Get student education details
    const [education] = await pool.query(
      'SELECT * FROM user_education WHERE user_id = ? ORDER BY start_date DESC',
      [studentId]
    )
    
    // Get student skills
    const [skills] = await pool.query(
      'SELECT * FROM user_skills WHERE user_id = ?',
      [studentId]
    )
    
    // Get student projects
    const [projects] = await pool.query(
      'SELECT * FROM user_projects WHERE user_id = ? ORDER BY start_date DESC',
      [studentId]
    )
    
    // Get student experience
    const [experience] = await pool.query(
      'SELECT * FROM user_experience WHERE user_id = ? ORDER BY start_date DESC',
      [studentId]
    )
    
    // Get student's applications to this ICM's opportunities
    const [applications] = await pool.query(
      `SELECT 
        oa.id, oa.status, oa.application_date, oa.cover_letter,
        oa.gpa, oa.expected_graduation, oa.relevant_courses,
        oa.skills, oa.experience_summary, oa.review_notes,
        o.title as opportunity_title, o.type as opportunity_type
       FROM opportunity_applications oa
       JOIN opportunities o ON oa.opportunity_id = o.id
       WHERE oa.student_id = ? AND o.posted_by = ?
       ORDER BY oa.application_date DESC`,
      [studentId, req.currentUser.id]
    )
    
    res.json({
      success: true,
      student: {
        ...studentInfo[0],
        education,
        skills,
        projects,
        experience,
        applications
      }
    })
    
  } catch (error) {
    console.error('Error fetching student profile:', error)
    res.status(500).json({ message: 'Failed to fetch student profile' })
  }
})

// Get ICM stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.currentUser.id
    
    // Get total opportunities posted by this ICM
    const [opportunities] = await pool.query(
      'SELECT COUNT(*) as total FROM opportunities WHERE posted_by = ?',
      [userId]
    )
    
    // Get total applications received
    const [applications] = await pool.query(
      `SELECT COUNT(*) as total 
       FROM opportunity_applications oa 
       JOIN opportunities o ON oa.opportunity_id = o.id 
       WHERE o.posted_by = ?`,
      [userId]
    )
    
    // Get recent activity (last 7 days)
    const [recentActivity] = await pool.query(
      `SELECT COUNT(*) as total 
       FROM opportunities 
       WHERE posted_by = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [userId]
    )
    
    res.json({
      totalOpportunities: opportunities[0].total,
      totalApplications: applications[0].total,
      recentActivity: recentActivity[0].total
    })
  } catch (error) {
    console.error('Error fetching ICM stats:', error)
    res.status(500).json({ message: 'Failed to fetch stats' })
  }
})

// Get ICM profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.currentUser.id
    
    // Get basic user information
    const [userRows] = await pool.query(
      'SELECT id, name, email, role, approval_status, is_active, last_login, created_at, updated_at, university_id, institute_name FROM users WHERE id = ?',
      [userId]
    )
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' })
    }
    
    const userProfile = userRows[0]
    
    // Get ICM profile information
    const [icmRows] = await pool.query(
      'SELECT * FROM icm_profiles WHERE user_id = ?',
      [userId]
    )
    
    let icmProfile = null
    if (icmRows.length > 0) {
      icmProfile = icmRows[0]
    }
    
    // Combine the data in the format expected by the frontend
    const combinedProfile = {
      ...userProfile,
             company: {
         name: icmProfile?.company_name || 'Company Name',
         logoUrl: icmProfile?.company_logo_url || '',
         industryType: icmProfile?.industry_type || 'Information Technology',
         overview: icmProfile?.company_overview || '',
         yearEstablished: icmProfile?.year_established || null,
         headquartersLocation: icmProfile?.headquarters_location || '',
         websiteUrl: icmProfile?.website_url || '',
         contactEmail: icmProfile?.contact_email || userProfile.email,
         contactPhone: icmProfile?.contact_phone || '',
         officeAddress: icmProfile?.office_address || '',
         size: icmProfile?.company_size || '',
         branchesLocations: icmProfile?.branches_locations || '',
         keyClientsPartners: icmProfile?.key_clients_partners || '',
         servicesProducts: icmProfile?.services_products || '',
         certificationsAccreditations: icmProfile?.certifications_accreditations || '',
         annualRevenue: icmProfile?.annual_revenue || '',
         employeeCountRange: icmProfile?.employee_count_range || '',
         companyType: icmProfile?.company_type || 'sme',
         primaryMarkets: icmProfile?.primary_markets || '',
         socialMedia: {
           linkedin: icmProfile?.linkedin_url || '',
           twitter: icmProfile?.twitter_url || '',
           instagram: icmProfile?.instagram_url || ''
         }
       },
      culture: {
        mission: icmProfile?.mission_statement || '',
        vision: icmProfile?.vision_statement || '',
        coreValues: icmProfile?.core_values || '',
        diversityInclusion: icmProfile?.diversity_inclusion_policies || '',
        csrInitiatives: icmProfile?.csr_initiatives || ''
      },
      recruitment: {
        hiringStatus: icmProfile?.hiring_status || 'actively_hiring',
        opportunityTypes: (() => {
          try {
            const value = icmProfile?.opportunity_types;
            return value && typeof value === 'string' && value.trim() !== '' 
              ? JSON.parse(value) 
              : [];
          } catch (e) {
            console.warn('Failed to parse opportunity_types JSON:', e);
            return [];
          }
        })(),
        applicationProcess: icmProfile?.application_process || '',
        employeeBenefits: icmProfile?.employee_benefits || ''
      },
      highlights: {
        achievements: icmProfile?.recent_achievements || '',
        successStories: icmProfile?.case_studies || '',
        pressMentions: icmProfile?.press_mentions || '',
        photoGallery: (() => {
          try {
            const value = icmProfile?.photo_gallery;
            return value && typeof value === 'string' && value.trim() !== '' 
              ? JSON.parse(value) 
              : [];
          } catch (e) {
            console.warn('Failed to parse photo_gallery JSON:', e);
            return [];
          }
        })()
      },
      people: {
        leadership: (() => {
          try {
            const value = icmProfile?.leadership_info;
            return value && typeof value === 'string' && value.trim() !== '' 
              ? JSON.parse(value) 
              : [];
          } catch (e) {
            console.warn('Failed to parse leadership_info JSON:', e);
            return [];
          }
        })(),
        employeesOnPlatform: icmProfile?.employees_on_platform || 0
      }
    }
    
    res.json(combinedProfile)
  } catch (error) {
    console.error('Error fetching ICM profile:', error)
    res.status(500).json({ message: 'Failed to fetch profile' })
  }
})

// Update ICM profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.currentUser.id
    const { name, email, institute_name, company, culture, recruitment, highlights, people } = req.body
    
    console.log('Updating ICM profile:', { userId, name, email, institute_name, company, culture, recruitment, highlights, people })
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' })
    }
    
    // Start a transaction to update both users table and icm_profiles table
    const connection = await pool.getConnection()
    await connection.beginTransaction()
    
    try {
      // Update basic user fields in users table
      const [userResult] = await connection.query(
        `UPDATE users 
         SET name = ?, email = ?, institute_name = ?, updated_at = NOW()
         WHERE id = ?`,
        [name, email, institute_name || '', userId]
      )
      
      if (userResult.affectedRows === 0) {
        await connection.rollback()
        return res.status(404).json({ message: 'Profile not found' })
      }
      
      // Check if ICM profile exists, if not create it
      const [existingProfile] = await connection.query(
        'SELECT id FROM icm_profiles WHERE user_id = ?',
        [userId]
      )
      
      if (existingProfile.length === 0) {
        // Create new ICM profile with default values
        await connection.query(
          `INSERT INTO icm_profiles (
            user_id, company_name, company_logo_url, industry_type, company_overview, 
            year_established, headquarters_location, website_url, 
            contact_email, contact_phone, office_address, linkedin_url, 
            twitter_url, instagram_url, company_size, branches_locations, 
            key_clients_partners, services_products, certifications_accreditations,
            mission_statement, vision_statement, core_values, 
            diversity_inclusion_policies, csr_initiatives, hiring_status,
            opportunity_types, application_process, employee_benefits,
            recent_achievements, case_studies, press_mentions, photo_gallery,
            leadership_info, employees_on_platform, annual_revenue,
            employee_count_range, company_type, primary_markets
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                     [
             userId,
             company?.name || 'Company Name',
             company?.logoUrl || '',
             company?.industryType || 'Information Technology',
            company?.overview || '',
            company?.yearEstablished || null,
            company?.headquartersLocation || '',
            company?.websiteUrl || '',
            company?.contactEmail || email,
            company?.contactPhone || '',
            company?.officeAddress || '',
            company?.socialMedia?.linkedin || '',
            company?.socialMedia?.twitter || '',
            company?.socialMedia?.instagram || '',
            company?.size || '',
            company?.branchesLocations || '',
            company?.keyClientsPartners || '',
            company?.servicesProducts || '',
            company?.certificationsAccreditations || '',
            culture?.mission || '',
            culture?.vision || '',
            culture?.coreValues || '',
            culture?.diversityInclusion || '',
            culture?.csrInitiatives || '',
            recruitment?.hiringStatus || 'actively_hiring',
            JSON.stringify(recruitment?.opportunityTypes || []),
            recruitment?.applicationProcess || '',
            recruitment?.employeeBenefits || '',
            highlights?.achievements || '',
            highlights?.successStories || '',
            highlights?.pressMentions || '',
            JSON.stringify(highlights?.photoGallery || []),
            JSON.stringify(people?.leadership || []),
            people?.employeesOnPlatform || 0,
            company?.annualRevenue || '',
            company?.employeeCountRange || '',
            company?.companyType || 'sme',
            company?.primaryMarkets || ''
          ]
        )
      } else {
                 // Update existing ICM profile
         await connection.query(
           `UPDATE icm_profiles SET
             company_name = ?, company_logo_url = ?, industry_type = ?, company_overview = ?,
            year_established = ?, headquarters_location = ?, website_url = ?,
            contact_email = ?, contact_phone = ?, office_address = ?, linkedin_url = ?,
            twitter_url = ?, instagram_url = ?, company_size = ?, branches_locations = ?,
            key_clients_partners = ?, services_products = ?, certifications_accreditations = ?,
            mission_statement = ?, vision_statement = ?, core_values = ?,
            diversity_inclusion_policies = ?, csr_initiatives = ?, hiring_status = ?,
            opportunity_types = ?, application_process = ?, employee_benefits = ?,
            recent_achievements = ?, case_studies = ?, press_mentions = ?, photo_gallery = ?,
            leadership_info = ?, employees_on_platform = ?, annual_revenue = ?,
            employee_count_range = ?, company_type = ?, primary_markets = ?,
            updated_at = NOW()
            WHERE user_id = ?`,
                     [
             company?.name || 'Company Name',
             company?.logoUrl || '',
             company?.industryType || 'Information Technology',
            company?.overview || '',
            company?.yearEstablished || null,
            company?.headquartersLocation || '',
            company?.websiteUrl || '',
            company?.contactEmail || email,
            company?.contactPhone || '',
            company?.officeAddress || '',
            company?.socialMedia?.linkedin || '',
            company?.socialMedia?.twitter || '',
            company?.socialMedia?.instagram || '',
            company?.size || '',
            company?.branchesLocations || '',
            company?.keyClientsPartners || '',
            company?.servicesProducts || '',
            company?.certificationsAccreditations || '',
            culture?.mission || '',
            culture?.vision || '',
            culture?.coreValues || '',
            culture?.diversityInclusion || '',
            culture?.csrInitiatives || '',
            recruitment?.hiringStatus || 'actively_hiring',
            JSON.stringify(recruitment?.opportunityTypes || []),
            recruitment?.applicationProcess || '',
            recruitment?.employeeBenefits || '',
            highlights?.achievements || '',
            highlights?.successStories || '',
            highlights?.pressMentions || '',
            JSON.stringify(highlights?.photoGallery || []),
            JSON.stringify(people?.leadership || []),
            people?.employeesOnPlatform || 0,
            company?.annualRevenue || '',
            company?.employeeCountRange || '',
            company?.companyType || 'sme',
            company?.primaryMarkets || '',
            userId
          ]
        )
      }
      
      await connection.commit()
      console.log('ICM profile updated successfully')
      res.json({ message: 'Profile updated successfully' })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('Error updating ICM profile:', error)
    res.status(500).json({ message: 'Failed to update profile' })
  }
})

// Update an opportunity
router.put('/opportunities/:opportunityId', requireAuth, async (req, res) => {
  try {
    const userId = req.currentUser.id
    const opportunityId = req.params.opportunityId
    const updateData = req.body
    
    // Verify that this opportunity belongs to the current ICM user
    const [opportunityCheck] = await pool.query(
      'SELECT id FROM opportunities WHERE id = ? AND posted_by = ?',
      [opportunityId, userId]
    )
    
    if (opportunityCheck.length === 0) {
      return res.status(404).json({ message: 'Opportunity not found or access denied' })
    }
    
    // Update the opportunity
    const [result] = await pool.query(
      `UPDATE opportunities SET
        title = ?, description = ?, requirements = ?, stipend = ?, duration = ?,
        location = ?, contact_email = ?, contact_phone = ?, closing_date = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [
        updateData.title,
        updateData.description,
        updateData.requirements,
        updateData.stipend,
        updateData.duration,
        updateData.location,
        updateData.contact_email,
        updateData.contact_phone,
        updateData.closing_date,
        opportunityId
      ]
    )
    
    if (result.affectedRows === 0) {
      return res.status(500).json({ message: 'Failed to update opportunity' })
    }
    
    res.json({
      success: true,
      message: 'Opportunity updated successfully'
    })
  } catch (error) {
    console.error('Error updating opportunity:', error)
    res.status(500).json({ message: 'Failed to update opportunity' })
  }
})

export default router
