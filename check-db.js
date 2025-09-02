import pool from './src/db.js';

async function checkDatabase() {
  try {
    console.log('🔍 Checking Database Structure...\n');
    
    // Check users table structure
    console.log('1. Users table structure:');
    const [userColumns] = await pool.query('DESCRIBE users');
    userColumns.forEach(col => {
      console.log(`   ${col.Field} - ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });
    
    // Check users table data
    console.log('\n2. Sample users data:');
    const [users] = await pool.query('SELECT id, name, email, role, is_active FROM users LIMIT 5');
    users.forEach(user => {
      console.log(`   ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}, Active: ${user.is_active}`);
    });
    
    // Check if email_verified column exists
    console.log('\n3. Checking for email_verified column...');
    const hasEmailVerified = userColumns.some(col => col.Field === 'email_verified');
    console.log(`   email_verified column: ${hasEmailVerified ? '✅ Exists' : '❌ Missing'}`);
    
    if (!hasEmailVerified) {
      console.log('   This column is required for email notifications to work!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
    console.log('\n🏁 Check completed');
  }
}

checkDatabase();
