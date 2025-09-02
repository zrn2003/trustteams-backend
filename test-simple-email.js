// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

import { sendEmail } from './src/config/email.js';

async function testSimpleEmail() {
  try {
    console.log('🔍 Testing Simple Email System...\n');
    
    // Check email configuration
    console.log('1. Checking email configuration...');
    console.log(`   EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Set' : '❌ Not set'}`);
    console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅ Set' : '❌ Not set'}`);
    console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || '❌ Not set'}`);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('\n❌ Email configuration incomplete. Please check your .env file.');
      return;
    }
    
    // Test email sending
    console.log('\n2. Testing email sending...');
    const testEmail = 'test@example.com'; // Use a test email
    const testName = 'Test User';
    const testToken = 'test-token-123';
    
    try {
      const emailResult = await sendEmail(testEmail, 'verification', [testName, `http://localhost:5173/verify-email/${testToken}`]);
      
      if (emailResult.success) {
        console.log(`✅ Test email sent successfully to ${testEmail}`);
        console.log(`   Message ID: ${emailResult.messageId}`);
      } else {
        console.log(`❌ Failed to send test email: ${emailResult.error}`);
      }
    } catch (emailError) {
      console.log(`❌ Email sending error: ${emailError.message}`);
      console.log(`   Error stack: ${emailError.stack}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\n🏁 Test completed');
    process.exit(0);
  }
}

testSimpleEmail();
