import pool from './src/db.js';
import { sendEmail } from './src/config/email.js';

async function testEmailSystem() {
  try {
    console.log('🔍 Testing Email System...\n');
    
    // 1. Check database connection
    console.log('1. Testing database connection...');
    const [result] = await pool.query('SELECT 1 as test');
    console.log('✅ Database connected successfully\n');
    
    // 2. Check if students exist
    console.log('2. Checking for students in database...');
    const [students] = await pool.query(
      'SELECT id, name, email, role, is_active, email_verified FROM users WHERE role = "student"'
    );
    
    console.log(`Found ${students.length} students:`);
    students.forEach(student => {
      console.log(`  - ${student.name} (${student.email}) - Active: ${student.is_active}, Verified: ${student.email_verified}`);
    });
    
    // 3. Check active verified students
    console.log('\n3. Checking for active verified students...');
    const [activeStudents] = await pool.query(
      'SELECT id, name, email FROM users WHERE role = "student" AND is_active = 1 AND email_verified = 1'
    );
    
    console.log(`Found ${activeStudents.length} active verified students:`);
    activeStudents.forEach(student => {
      console.log(`  - ${student.name} (${student.email})`);
    });
    
    // 4. Test email sending if students exist
    if (activeStudents.length > 0) {
      console.log('\n4. Testing email sending...');
      const testStudent = activeStudents[0];
      
      try {
        const emailResult = await sendEmail(testStudent.email, 'opportunity', [
          testStudent.name,
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
          console.log(`✅ Test email sent successfully to ${testStudent.email}`);
          console.log(`   Message ID: ${emailResult.messageId}`);
        } else {
          console.log(`❌ Failed to send test email: ${emailResult.error}`);
        }
      } catch (emailError) {
        console.log(`❌ Email sending error: ${emailError.message}`);
      }
    } else {
      console.log('\n⚠️  No active verified students found. Cannot test email sending.');
      console.log('   Make sure you have students with verified emails in the database.');
    }
    
    // 5. Check email configuration
    console.log('\n5. Checking email configuration...');
    try {
      const { emailConfig } = await import('./config.js');
      console.log(`   EMAIL_USER: ${emailConfig.EMAIL_USER ? '✅ Set' : '❌ Not set'}`);
      console.log(`   EMAIL_PASS: ${emailConfig.EMAIL_PASS ? '✅ Set' : '❌ Not set'}`);
      console.log(`   FRONTEND_URL: ${emailConfig.FRONTEND_URL || '❌ Not set'}`);
    } catch (configError) {
      console.log(`❌ Error loading email config: ${configError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
    console.log('\n🏁 Test completed');
  }
}

testEmailSystem();
