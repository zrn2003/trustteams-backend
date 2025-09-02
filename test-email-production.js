// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

import { sendEmail } from './src/config/email.js';

async function testEmailProduction() {
  try {
    console.log('🔍 Testing Email Service for Production...\n');
    
    // 1. Check environment variables
    console.log('1. Environment Variables Check:');
    const envCheck = {
      EMAIL_USER: process.env.EMAIL_USER ? '✅ Set' : '❌ Missing',
      EMAIL_PASS: process.env.EMAIL_PASS ? '✅ Set' : '❌ Missing',
      FRONTEND_URL: process.env.FRONTEND_URL || '❌ Not set',
      NODE_ENV: process.env.NODE_ENV || '❌ Not set'
    };
    
    Object.entries(envCheck).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('\n❌ Email configuration incomplete. Please check your .env file.');
      return;
    }
    
    // 2. Test email sending
    console.log('\n2. Testing Email Sending...');
    const testEmail = 'test@example.com'; // Use a test email
    const testName = 'Test User';
    const testToken = 'test-token-' + Date.now();
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${testToken}`;
    
    console.log(`   To: ${testEmail}`);
    console.log(`   Name: ${testName}`);
    console.log(`   Verification Link: ${verificationLink}`);
    
    try {
      const emailResult = await sendEmail(testEmail, 'verification', [testName, verificationLink]);
      
      if (emailResult.success) {
        console.log(`\n✅ Test email sent successfully!`);
        console.log(`   Message ID: ${emailResult.messageId}`);
        console.log(`   Response:`, emailResult);
      } else {
        console.log(`\n❌ Failed to send test email:`);
        console.log(`   Error: ${emailResult.error}`);
        if (emailResult.details) {
          console.log(`   Details:`, emailResult.details);
        }
      }
      
      return emailResult;
      
    } catch (emailError) {
      console.log(`\n❌ Email sending error:`);
      console.log(`   Error: ${emailError.message}`);
      console.log(`   Stack: ${emailError.stack}`);
      return {
        success: false,
        error: emailError.message
      };
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    console.log('\n🏁 Email test completed');
    process.exit(0);
  }
}

testEmailProduction();
