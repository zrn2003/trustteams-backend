import pool from './src/db.js'

async function checkUserRoles() {
  try {
    console.log('🔍 Checking user roles in database...')
    
    // Get all users with their roles
    const [users] = await pool.query(
      'SELECT id, name, email, role, is_active, approval_status FROM users ORDER BY role, name'
    )
    
    console.log(`📊 Total users: ${users.length}`)
    
    // Group users by role
    const usersByRole = {}
    users.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = []
      }
      usersByRole[user.role].push({
        id: user.id,
        name: user.name,
        email: user.email,
        is_active: user.is_active,
        approval_status: user.approval_status
      })
    })
    
    // Display users by role
    Object.keys(usersByRole).forEach(role => {
      console.log(`\n👥 Role: ${role} (${usersByRole[role].length} users)`)
      usersByRole[role].forEach(user => {
        console.log(`   - ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Active: ${user.is_active}, Approval: ${user.approval_status}`)
      })
    })
    
    // Check specifically for ICM users
    const [icmUsers] = await pool.query(
      "SELECT id, name, email, is_active, approval_status FROM users WHERE role = 'icm'"
    )
    
    console.log(`\n🎯 ICM Users (${icmUsers.length}):`)
    if (icmUsers.length === 0) {
      console.log('   ❌ No users with ICM role found!')
      console.log('   💡 You need to create a user with role = "icm" or update an existing user')
    } else {
      icmUsers.forEach(user => {
        console.log(`   - ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Active: ${user.is_active}, Approval: ${user.approval_status}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error checking user roles:', error)
  } finally {
    await pool.end()
    console.log('\n🔌 Database connection closed')
  }
}

// Run the check
checkUserRoles()
