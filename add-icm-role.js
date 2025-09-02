import pool from './src/db.js'

async function addIcmRole() {
  try {
    console.log('🔧 Adding ICM role to database...')
    
    console.log('✅ Database connected successfully')
    
    // Check current role enum
    const [rows] = await pool.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`
    )
    
    const colType = rows?.[0]?.COLUMN_TYPE || ''
    console.log('📋 Current role ENUM:', colType)
    
    // Check if ICM role already exists
    if (/\b'icm'\b/.test(colType)) {
      console.log('✅ ICM role already exists in database')
      return
    }
    
    // Add ICM role to ENUM
    console.log('🔧 Adding ICM role to ENUM...')
    await pool.query(
      "ALTER TABLE users MODIFY role ENUM('admin','manager','viewer','student','academic_leader','university_admin','icm') NOT NULL DEFAULT 'student'"
    )
    
    console.log('✅ ICM role added successfully!')
    
    // Verify the change
    const [verifyRows] = await pool.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`
    )
    
    const newColType = verifyRows?.[0]?.COLUMN_TYPE || ''
    console.log('📋 Updated role ENUM:', newColType)
    
    // Check if there are any existing users with 'icm' role
    const [icmUsers] = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'icm'"
    )
    
    console.log(`📊 Users with ICM role: ${icmUsers[0].count}`)
    
  } catch (error) {
    console.error('❌ Error adding ICM role:', error)
  } finally {
    // Close the pool
    await pool.end()
    console.log('🔌 Database connection closed')
  }
}

// Run the migration
addIcmRole()
