import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function testIcmAuth() {
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    })

    console.log('✅ Database connected')

    // Test user ID 73 (joy)
    const userId = 73
    console.log(`🔍 Testing user ID: ${userId}`)

    // Query the user
    const [rows] = await connection.query(
      'SELECT id, name, email, role, approval_status, is_active FROM users WHERE id = ?',
      [userId]
    )

    console.log('📊 Query result:', {
      userId,
      rowsFound: rows.length,
      userData: rows[0]
    })

    if (rows.length > 0) {
      const user = rows[0]
      console.log('👤 User details:', {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        approval_status: user.approval_status,
        is_active: user.is_active
      })

      // Check if role is allowed
      const allowedRoles = ['university_admin', 'admin', 'academic_leader', 'icm']
      const isRoleAllowed = allowedRoles.includes(user.role)
      
      console.log('🔐 Role check:', {
        userRole: user.role,
        allowedRoles,
        isRoleAllowed
      })

      if (isRoleAllowed) {
        console.log('✅ User should be authorized')
      } else {
        console.log('❌ User role not allowed')
      }
    } else {
      console.log('❌ User not found')
    }

    await connection.end()
    console.log('✅ Test completed')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testIcmAuth()
