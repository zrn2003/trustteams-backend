import pool from './src/db.js'

async function testDatabase() {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    const connection = await pool.getConnection()
    console.log('✅ Database connection successful')
    
    // Test if database exists
    const [databases] = await connection.query('SHOW DATABASES LIKE "trustteams"')
    if (databases.length === 0) {
      console.log('❌ Database "trustteams" does not exist')
      console.log('Please run: mysql -u root -p < sql/schema.sql')
    } else {
      console.log('✅ Database "trustteams" exists')
    }
    
    // Test if tables exist
    const [tables] = await connection.query('SHOW TABLES')
    console.log('📋 Available tables:', tables.map(t => Object.values(t)[0]))
    
    // Test user_roles table
    const [roles] = await connection.query('SELECT * FROM user_roles LIMIT 3')
    console.log('👥 User roles:', roles.length, 'found')
    
    // Test users table
    const [users] = await connection.query('SELECT id, email, name, role_id FROM users LIMIT 3')
    console.log('👤 Users:', users.length, 'found')
    
    connection.release()
    console.log('✅ Database test completed successfully')
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message)
    console.log('\nTroubleshooting steps:')
    console.log('1. Make sure MySQL is running')
    console.log('2. Check your MySQL credentials')
    console.log('3. Create the database: CREATE DATABASE trustteams;')
    console.log('4. Run the schema: mysql -u root -p trustteams < sql/schema.sql')
    console.log('5. Run the seed data: mysql -u root -p trustteams < sql/seed.sql')
  }
}

testDatabase()
