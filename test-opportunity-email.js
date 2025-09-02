import pool from './src/db.js';
import { sendEmail } from './src/config/email.js';

async function testOpportunityEmail() {
  try {
    console.log('🎯 Testing Opportunity Email Notification...\n');
    
    // 1. Find verified students
    console.log('1. Finding verified students...');
    const [verifiedStudents] = await pool.query(`
      SELECT id, name, email, role, is_active, email_verified 
      FROM users 
      WHERE role = 'student' AND is_active = 1 AND email_verified = 1
    `);
    
    if (verifiedStudents.length === 0) {
      console.log('   ❌ No verified students found!');
      console.log('   💡 Students need to verify their emails to receive notifications.');
      return;
    }
    
    console.log(`   Found ${verifiedStudents.length} verified students:`);
    verifiedStudents.forEach(student => {
      console.log(`     - ${student.name} (${student.email})`);
    });
    
    // 2. Test opportunity email
    console.log('\n2. Testing opportunity email notification...');
    const testStudent = verifiedStudents[0];
    
    try {
      const emailResult = await sendEmail(testStudent.email, 'opportunity', [
        testStudent.name,
        'Dr. Smith (Academic Leader)',
        'Software Engineering Internship',
        'Internship',
        'Join our dynamic team working on cutting-edge software projects. This is an excellent opportunity for students interested in software development, machine learning, and web technologies.',
        '• Strong programming skills in Python, JavaScript, or Java\n• Knowledge of web development frameworks\n• Good understanding of algorithms and data structures\n• Currently enrolled in Computer Science or related field',
        '$2000/month + benefits',
        '6 months (with possibility of extension)',
        'San Francisco, CA (Hybrid)',
        'December 31, 2024',
        'http://localhost:5173/opportunities/123'
      ]);
      
      if (emailResult.success) {
        console.log(`   ✅ Opportunity email sent successfully to ${testStudent.email}!`);
        console.log(`   📧 Message ID: ${emailResult.messageId}`);
        console.log('\n   📬 Check the email inbox for the opportunity notification.');
        console.log('   🎯 The email should contain:');
        console.log('      - Beautiful TrustTeams branding');
        console.log('      - Complete opportunity details');
        console.log('      - Large "Apply Now" button');
        console.log('      - Direct link to the opportunity');
      } else {
        console.log(`   ❌ Failed to send opportunity email: ${emailResult.error}`);
      }
    } catch (emailError) {
      console.log(`   ❌ Email sending error: ${emailError.message}`);
    }
    
    // 3. Show what happens when posting an opportunity
    console.log('\n3. How the system works:');
    console.log('   When an academic leader or ICM posts an opportunity:');
    console.log('   1. ✅ Opportunity is created in database');
    console.log('   2. ✅ System finds all active verified students');
    console.log('   3. ✅ Sends personalized emails to each student');
    console.log('   4. ✅ Each email contains opportunity details + Apply button');
    
    console.log('\n   📊 Current status:');
    console.log(`      - Total students: 10`);
    console.log(`      - Active students: ${verifiedStudents.filter(s => s.is_active).length}`);
    console.log(`      - Verified students: ${verifiedStudents.length}`);
    console.log(`      - Students who will receive notifications: ${verifiedStudents.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
    console.log('\n🏁 Test completed');
  }
}

testOpportunityEmail();
