import pool from './src/db.js'

async function updateUserRole(userId, newRole) {
  try {
    console.log(`🔧 Updating user ${userId} role to ${newRole}...`)
    
    // First, check if the user exists
    const [users] = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [userId]
    )
    
    if (users.length === 0) {
      console.log(`❌ User with ID ${userId} not found!`)
      return
    }
    
    const user = users[0]
    console.log(`📋 Current user: ID ${user.id}, Name: ${user.name}, Email: ${user.email}, Current Role: ${user.role}`)
    
    // Check if the new role is valid
    const validRoles = ['admin', 'manager', 'viewer', 'student', 'academic_leader', 'university_admin', 'icm']
    if (!validRoles.includes(newRole)) {
      console.log(`❌ Invalid role: ${newRole}`)
      console.log(`💡 Valid roles: ${validRoles.join(', ')}`)
      return
    }
    
    // Update the user's role
    await pool.query(
      'UPDATE users SET role = ? WHERE id = ?',
      [newRole, userId]
    )
    
    console.log(`✅ Successfully updated user ${userId} role from ${user.role} to ${newRole}`)
    
    // Verify the change
    const [updatedUsers] = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [userId]
    )
    
    if (updatedUsers.length > 0) {
      const updatedUser = updatedUsers[0]
      console.log(`📋 Updated user: ID ${updatedUser.id}, Name: ${updatedUser.name}, Email: ${updatedUser.email}, New Role: ${updatedUser.role}`)
    }
    
  } catch (error) {
    console.error('❌ Error updating user role:', error)
  } finally {
    await pool.end()
    console.log('\n🔌 Database connection closed')
  }
}

// Get command line arguments
const args = process.argv.slice(2)
if (args.length !== 2) {
  console.log('💡 Usage: node update-user-role.js <userId> <newRole>')
  console.log('💡 Example: node update-user-role.js 73 icm')
  console.log('💡 Valid roles: admin, manager, viewer, student, academic_leader, university_admin, icm')
  process.exit(1)
}

const userId = parseInt(args[0])
const newRole = args[1]

if (isNaN(userId)) {
  console.log('❌ Invalid user ID. Please provide a number.')
  process.exit(1)
}

// Run the update
updateUserRole(userId, newRole)
