import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root', // Empty password for default MySQL setup
  database: process.env.DB_NAME || 'trustteams',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// Test the connection
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully')
    connection.release()
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message)
    console.log('Please check your MySQL configuration:')
    console.log('- MySQL server is running')
    console.log('- Database "trustteams" exists')
    console.log('- User credentials are correct')
    console.log('- Try running: mysql -u root -p < sql/schema.sql')
  })

export default pool


