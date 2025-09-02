// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

import pool from './src/db.js'

async function verifyStudentsForTesting() {
  try {
    console.log('🔧 Verifying Students for Opportunity Notifications...\n')
    
    // Get all active students who aren't verified
    const [unverifiedStudents] = await pool.query(`
      SELECT id, name, email, role, is_active, email_verified 
      FROM users 
      WHERE role = 'student' AND is_active = 1 AND email_verified = 0
    `)
    
    console.log(`Found ${unverifiedStudents.length} unverified active students:`)
    unverifiedStudents.forEach(student => {
      console.log(`   - ${student.name} (${student.email})`)
    })
    
    if (unverifiedStudents.length === 0) {
      console.log('No unverified students found')
      return
    }
    
    // Verify the first 3 students for testing
    const studentsToVerify = unverifiedStudents.slice(0, 3)
    console.log(`\nVerifying ${studentsToVerify.length} students for testing...`)
    
    for (const student of studentsToVerify) {
      try {
        await pool.query(`
          UPDATE users 
          SET email_verified = 1, 
              email_verification_token = NULL, 
              email_verification_expires = NULL 
          WHERE id = ?
        `, [student.id])
        
        console.log(`✅ Verified: ${student.name} (${student.email})`)
      } catch (error) {
        console.error(`❌ Failed to verify ${student.name}:`, error.message)
      }
    }
    
    // Check the result
    const [verifiedStudents] = await pool.query(`
      SELECT id, name, email 
      FROM users 
      WHERE role = 'student' AND is_active = 1 AND email_verified = 1
    `)
    
    console.log(`\n📊 Now ${verifiedStudents.length} students are eligible for notifications:`)
    verifiedStudents.forEach(student => {
      console.log(`   - ${student.name} (${student.email})`)
    })
    
  } catch (error) {
    console.error('❌ Error verifying students:', error)
  } finally {
    await pool.end()
    console.log('\n🏁 Verification completed')
  }
}

verifyStudentsForTesting()
