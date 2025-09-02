import pool from './src/db.js';
import { sendEmail } from './src/config/email.js';

async function checkStudentsAndEmail() {
  try {
    console.log('🔍 Checking Students and Email System...\n');
    
    // 1. Check all users by role
    console.log('1. Users by role:');
    const [usersByRole] = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);
    
    usersByRole.forEach(row => {
      console.log(`   ${row.role}: ${row.count} users`);
    });
    
    // 2. Check for students specifically
    console.log('\n2. Looking for students:');
    const [students] = await pool.query(`
      SELECT id, name, email, role, is_active, email_verified 
      FROM users 
      WHERE role = 'student'
    `);
    
    if (students.length === 0) {
      console.log('   ❌ No users with role "student" found!');
      console.log('   💡 You need to create student accounts first.');
    } else {
      console.log(`   Found ${students.length} students:`);
      students.forEach(student => {
        console.log(`     - ${student.name} (${student.email}) - Active: ${student.is_active}, Verified: ${student.email_verified}`);
      });
    }
    
    // 3. Check for any users that could be students
    console.log('\n3. Checking for potential students (users with student-like names or emails):');
    const [potentialStudents] = await pool.query(`
      SELECT id, name, email, role, is_active, email_verified 
      FROM users 
      WHERE name LIKE '%student%' OR email LIKE '%student%' OR email LIKE '%@student%'
    `);
    
    if (potentialStudents.length > 0) {
      console.log('   Found potential students:');
      potentialStudents.forEach(user => {
        console.log(`     - ${user.name} (${user.email}) - Role: ${user.role}, Active: ${user.is_active}, Verified: ${user.email_verified}`);
      });
    } else {
      console.log('   No potential students found');
    }
    
    // 4. Check email configuration
    console.log('\n4. Checking email configuration:');
    try {
      const { emailConfig } = await import('./config.js');
      console.log(`   EMAIL_USER: ${emailConfig.EMAIL_USER ? '✅ Set' : '❌ Not set'}`);
      console.log(`   EMAIL_PASS: ${emailConfig.EMAIL_PASS ? '✅ Set' : '❌ Not set'}`);
      console.log(`   FRONTEND_URL: ${emailConfig.FRONTEND_URL || '❌ Not set'}`);
      
      if (!emailConfig.EMAIL_USER || !emailConfig.EMAIL_PASS) {
        console.log('\n   ❌ Email configuration incomplete!');
        console.log('   📖 Please check your .env file and config.js');
      }
    } catch (configError) {
      console.log(`   ❌ Error loading email config: ${configError.message}`);
    }
    
    // 5. Test email with a test address if no students exist
    if (students.length === 0) {
      console.log('\n5. Testing email system with test address...');
      try {
        const testEmail = 'test@example.com'; // This won't actually send, just test the system
        const emailResult = await sendEmail(testEmail, 'opportunity', [
          'Test Student',
          'Test User',
          'Test Opportunity',
          'Internship',
          'This is a test opportunity description',
          'Basic requirements',
          '$1000/month',
          '3 months',
          'Remote',
          '2024-12-31',
          'http://localhost:5173/test-opportunity'
        ]);
        
        if (emailResult.success) {
          console.log(`   ✅ Email system working! (sent to ${testEmail})`);
        } else {
          console.log(`   ❌ Email system failed: ${emailResult.error}`);
        }
      } catch (emailError) {
        console.log(`   ❌ Email system error: ${emailError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
    console.log('\n🏁 Check completed');
  }
}

checkStudentsAndEmail();
