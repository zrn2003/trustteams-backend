// Test Email Configuration
import { sendEmail } from './src/config/email.js';
import { emailConfig } from './config.js';

console.log('🧪 Testing Email Configuration...');
console.log('📧 Email User:', emailConfig.EMAIL_USER ? '✅ Set' : '❌ Not Set');
console.log('🔑 Email Pass:', emailConfig.EMAIL_PASS ? '✅ Set' : '❌ Not Set');
console.log('🌐 Frontend URL:', emailConfig.FRONTEND_URL);

if (!emailConfig.EMAIL_USER || !emailConfig.EMAIL_PASS) {
  console.log('\n❌ Email configuration incomplete!');
  console.log('📖 Please follow the EMAIL_SETUP_GUIDE.md instructions.');
  process.exit(1);
}

console.log('\n✅ Email configuration looks good!');
console.log('📤 Testing email send...');

try {
  const result = await sendEmail(
    emailConfig.EMAIL_USER, // Send to yourself as a test
    'welcome',
    ['Test User']
  );
  
  if (result.success) {
    console.log('🎉 Test email sent successfully!');
    console.log('📧 Check your inbox for the welcome email.');
  } else {
    console.log('❌ Failed to send test email:', result.error);
  }
} catch (error) {
  console.error('🚨 Error testing email:', error.message);
}
