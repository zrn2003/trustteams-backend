// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

import pool from './src/db.js'

async function checkStudentsForNotifications() {
  try {
    console.log('🔍 Checking Students for Opportunity Notifications...\n')
    
    // 1. Check total users
    const [totalUsers] = await pool.query('SELECT COUNT(*) as total FROM users')
    console.log(`1. Total users in database: ${totalUsers[0].total}`)
    
    // 2. Check users by role
    const [usersByRole] = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `)
    console.log('\n2. Users by role:')
    usersByRole.forEach(row => {
      console.log(`   ${row.role}: ${row.count}`)
    })
    
    // 3. Check students specifically
    const [students] = await pool.query(`
      SELECT id, name, email, role, is_active, email_verified 
      FROM users 
      WHERE role = 'student'
    `)
    console.log(`\n3. Total students: ${students.length}`)
    
    if (students.length > 0) {
      console.log('\n   Student details:')
      students.forEach(student => {
        console.log(`   - ID: ${student.id}, Name: ${student.name}, Email: ${student.email}`)
        console.log(`     Active: ${student.is_active}, Verified: ${student.email_verified}`)
      })
    }
    
    // 4. Check active and verified students (what getAllActiveStudents returns)
    const [activeStudents] = await pool.query(`
      SELECT id, name, email 
      FROM users 
      WHERE role = 'student' AND is_active = 1 AND email_verified = 1
    `)
    console.log(`\n4. Active and verified students (eligible for notifications): ${activeStudents.length}`)
    
    if (activeStudents.length > 0) {
      console.log('\n   Eligible students:')
      activeStudents.forEach(student => {
        console.log(`   - ${student.name} (${student.email})`)
      })
    } else {
      console.log('\n   ❌ NO STUDENTS ELIGIBLE FOR NOTIFICATIONS!')
      console.log('   This explains why no emails are being sent.')
    }
    
    // 5. Check if there are any opportunities
    const [opportunities] = await pool.query('SELECT COUNT(*) as total FROM opportunities')
    console.log(`\n5. Total opportunities in database: ${opportunities[0].total}`)
    
    // 6. Check recent opportunities
    const [recentOpportunities] = await pool.query(`
      SELECT id, title, posted_by, created_at 
      FROM opportunities 
      ORDER BY created_at DESC 
      LIMIT 5
    `)
    console.log('\n6. Recent opportunities:')
    if (recentOpportunities.length > 0) {
      recentOpportunities.forEach(opp => {
        console.log(`   - ID: ${opp.id}, Title: ${opp.title}, Posted: ${opp.created_at}`)
      })
    } else {
      console.log('   No opportunities found')
    }
    
  } catch (error) {
    console.error('❌ Error checking students:', error)
  } finally {
    await pool.end()
    console.log('\n🏁 Check completed')
  }
}

checkStudentsForNotifications()
