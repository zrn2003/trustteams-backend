import nodemailer from 'nodemailer';

const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  return transporter;
};

const emailTemplates = {
  verification: (name, verificationLink) => ({
    subject: 'Verify Your Email - TrustTeams',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - TrustTeams</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with TrustTeams branding -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <div style="display: inline-flex; align-items: center; gap: 12px; margin-bottom: 20px;">
              <div style="width: 48px; height: 48px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px; color: white;">🎓</span>
              </div>
              <span style="font-size: 28px; font-weight: 800; color: white;">TrustTeams</span>
            </div>
            <h1 style="color: white; font-size: 32px; font-weight: 700; margin: 0;">Email Verification</h1>
            <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 16px 0 0 0;">Secure your account with email verification</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1a202c; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">Welcome to TrustTeams!</h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Hi <strong>${name}</strong>,</p>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Thank you for signing up! To complete your registration and access your account, please verify your email address by clicking the button below.
            </p>
            
            <!-- Verification Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${verificationLink}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px 36px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                ✨ Verify Email Address
              </a>
            </div>
            
            <!-- Alternative Link -->
            <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 30px 0;">
              <p style="color: #4a5568; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">🔗 Alternative Verification Link</p>
              <p style="color: #6b7280; font-size: 14px; margin: 0; word-break: break-all; line-height: 1.5;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #667eea; font-size: 14px; margin: 8px 0 0 0; word-break: break-all; line-height: 1.5;">
                ${verificationLink}
              </p>
            </div>
            
            <!-- Important Notes -->
            <div style="background: rgba(102, 126, 234, 0.05); border-left: 4px solid #667eea; padding: 20px; margin: 30px 0;">
              <h3 style="color: #667eea; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">⚠️ Important Information</h3>
              <ul style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>This verification link will expire in <strong>24 hours</strong></li>
                <li>If you didn't create an account, you can safely ignore this email</li>
                <li>For security reasons, this link can only be used once</li>
              </ul>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 14px; margin: 0 0 8px 0;">Best regards,</p>
              <p style="color: #667eea; font-size: 16px; font-weight: 600; margin: 0;">The TrustTeams Team</p>
              <p style="color: #a0aec0; font-size: 12px; margin: 16px 0 0 0;">© 2024 TrustTeams. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),
  
  welcome: (name) => ({
    subject: 'Welcome to TrustTeams - Email Verified! 🎉',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to TrustTeams - Email Verified!</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with TrustTeams branding -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
            <div style="display: inline-flex; align-items: center; gap: 12px; margin-bottom: 20px;">
              <div style="width: 48px; height: 48px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px; color: white;">🎉</span>
              </div>
              <span style="font-size: 28px; font-weight: 800; color: white;">TrustTeams</span>
            </div>
            <h1 style="color: white; font-size: 32px; font-weight: 700; margin: 0;">Welcome to TrustTeams!</h1>
            <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 16px 0 0 0;">Your email has been verified successfully</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1a202c; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">Congratulations, ${name}! 🎊</h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Your email address has been successfully verified! You now have full access to all TrustTeams features.
            </p>
            
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 12px; padding: 24px; margin: 30px 0;">
              <h3 style="color: #0ea5e9; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">🚀 What's Next?</h3>
              <ul style="color: #1e40af; font-size: 16px; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>Complete your profile with additional information</li>
                <li>Browse and apply for opportunities</li>
                <li>Connect with other students and academic leaders</li>
                <li>Explore research collaborations and projects</li>
              </ul>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
                 style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 18px 36px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); transition: all 0.3s ease;">
                🚀 Go to Dashboard
              </a>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 14px; margin: 0 0 8px 0;">Best regards,</p>
              <p style="color: #10b981; font-size: 16px; font-weight: 600; margin: 0;">The TrustTeams Team</p>
              <p style="color: #a0aec0; font-size: 12px; margin: 16px 0 0 0;">© 2024 TrustTeams. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  resend: (name, verificationLink) => ({
    subject: 'Resend Verification - TrustTeams',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Resend Verification - TrustTeams</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with TrustTeams branding -->
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
            <div style="display: inline-flex; align-items: center; gap: 12px; margin-bottom: 20px;">
              <div style="width: 48px; height: 48px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px; color: white;">📧</span>
              </div>
              <span style="font-size: 28px; font-weight: 800; color: white;">TrustTeams</span>
            </div>
            <h1 style="color: white; font-size: 32px; font-weight: 700; margin: 0;">Verification Email Resent</h1>
            <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 16px 0 0 0;">Here's your verification link again</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1a202c; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">Hello ${name}! 👋</h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              We've resent your email verification link. Please click the button below to verify your email address.
            </p>
            
            <!-- Verification Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${verificationLink}" 
                 style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 18px 36px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4); transition: all 0.3s ease;">
                ✨ Verify Email Address
              </a>
            </div>
            
            <!-- Alternative Link -->
            <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 30px 0;">
              <p style="color: #4a5568; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">🔗 Alternative Verification Link</p>
              <p style="color: #6b7280; font-size: 14px; margin: 0; word-break: break-all; line-height: 1.5;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #f59e0b; font-size: 14px; margin: 8px 0 0 0; word-break: break-all; line-height: 1.5;">
                ${verificationLink}
              </p>
            </div>
            
            <!-- Important Notes -->
            <div style="background: rgba(245, 158, 11, 0.05); border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0;">
              <h3 style="color: #f59e0b; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">⚠️ Important Information</h3>
              <ul style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>This verification link will expire in <strong>24 hours</strong></li>
                <li>If you didn't request this email, you can safely ignore it</li>
                <li>For security reasons, this link can only be used once</li>
              </ul>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 14px; margin: 0 0 8px 0;">Best regards,</p>
              <p style="color: #f59e0b; font-size: 16px; font-weight: 600; margin: 0;">The TrustTeams Team</p>
              <p style="color: #a0aec0; font-size: 12px; margin: 16px 0 0 0;">© 2024 TrustTeams. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  opportunity: (studentName, postedByName, title, type, description, requirements, stipend, duration, location, deadline, opportunityLink) => ({
    subject: 'New Opportunity Available - TrustTeams',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Opportunity Available - TrustTeams</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with TrustTeams branding -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <div style="display: inline-flex; align-items: center; gap: 12px; margin-bottom: 20px;">
              <div style="width: 48px; height: 48px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px; color: white;">🎯</span>
              </div>
              <span style="font-size: 28px; font-weight: 800; color: white;">TrustTeams</span>
            </div>
            <h1 style="color: white; font-size: 32px; font-weight: 700; margin: 0;">New Opportunity Available!</h1>
            <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 16px 0 0 0;">Don't miss out on this exciting opportunity</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1a202c; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">Hello ${studentName}! 👋</h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Great news! <strong>${postedByName}</strong> has just posted a new opportunity that might be perfect for you. 
              Check out the details below and apply if you're interested!
            </p>
            
            <!-- Opportunity Details Card -->
            <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin: 30px 0;">
              <h3 style="color: #1a202c; font-size: 20px; font-weight: 700; margin: 0 0 16px 0; text-align: center;">${title}</h3>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                <div>
                  <p style="color: #4a5568; font-size: 14px; margin: 0 0 4px 0; font-weight: 600;">📋 Type</p>
                  <p style="color: #1a202c; font-size: 16px; margin: 0;">${type}</p>
                </div>
                <div>
                  <p style="color: #4a5568; font-size: 14px; margin: 0 0 4px 0; font-weight: 600;">📍 Location</p>
                  <p style="color: #1a202c; font-size: 16px; margin: 0;">${location}</p>
                </div>
                <div>
                  <p style="color: #4a5568; font-size: 14px; margin: 0 0 4px 0; font-weight: 600;">💰 Stipend</p>
                  <p style="color: #1a202c; font-size: 16px; margin: 0;">${stipend}</p>
                </div>
                <div>
                  <p style="color: #4a5568; font-size: 14px; margin: 0 0 4px 0; font-weight: 600;">⏱️ Duration</p>
                  <p style="color: #1a202c; font-size: 16px; margin: 0;">${duration}</p>
                </div>
              </div>
              
              <div style="margin-bottom: 20px;">
                <p style="color: #4a5568; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">📅 Deadline</p>
                <p style="color: #1a202c; font-size: 16px; margin: 0;">${deadline}</p>
              </div>
              
              <div style="margin-bottom: 20px;">
                <p style="color: #4a5568; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">📝 Description</p>
                <p style="color: #1a202c; font-size: 16px; margin: 0; line-height: 1.5;">${description}</p>
              </div>
              
              <div style="margin-bottom: 20px;">
                <p style="color: #4a5568; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">📋 Requirements</p>
                <p style="color: #1a202c; font-size: 16px; margin: 0; line-height: 1.5;">${requirements}</p>
              </div>
            </div>
            
            <!-- Apply Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${opportunityLink}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 40px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 700; font-size: 18px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                🚀 Apply Now
              </a>
            </div>
            
            <!-- Alternative Link -->
            <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 30px 0;">
              <p style="color: #4a5568; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">🔗 Direct Link</p>
              <p style="color: #6b7280; font-size: 14px; margin: 0; word-break: break-all; line-height: 1.5;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #667eea; font-size: 14px; margin: 8px 0 0 0; word-break: break-all; line-height: 1.5;">
                ${opportunityLink}
              </p>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 14px; margin: 0 0 8px 0;">Best regards,</p>
              <p style="color: #667eea; font-size: 16px; font-weight: 600; margin: 0;">The TrustTeams Team</p>
              <p style="color: #a0aec0; font-size: 12px; margin: 16px 0 0 0;">© 2024 TrustTeams. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// Main email sending function
export const sendEmail = async (to, template, data) => {
  try {
    // Validate email configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Email configuration missing:', {
        EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Missing',
        EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Missing'
      });
      return {
        success: false,
        error: 'Email configuration incomplete. Please check EMAIL_USER and EMAIL_PASS environment variables.'
      };
    }

    const transporter = createTransporter();
    
    let emailTemplate;
    let mailOptions;
    
    switch (template) {
      case 'verification':
        emailTemplate = emailTemplates.verification(data[0], data[1]);
        mailOptions = {
          from: `"TrustTeams" <${process.env.EMAIL_USER}>`,
          to: to,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        };
        break;
        
      case 'welcome':
        emailTemplate = emailTemplates.welcome(data[0]);
        mailOptions = {
          from: `"TrustTeams" <${process.env.EMAIL_USER}>`,
          to: to,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        };
        break;
        
      case 'resend':
        emailTemplate = emailTemplates.resend(data[0], data[1]);
        mailOptions = {
          from: `"TrustTeams" <${process.env.EMAIL_USER}>`,
          to: to,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        };
        break;
        
      case 'opportunity':
        emailTemplate = emailTemplates.opportunity(
          data[0], // studentName
          data[1], // postedByName
          data[2], // title
          data[3], // type
          data[4], // description
          data[5], // requirements
          data[6], // stipend
          data[7], // duration
          data[8], // location
          data[9], // deadline
          data[10] // opportunityLink
        );
        mailOptions = {
          from: `"TrustTeams" <${process.env.EMAIL_USER}>`,
          to: to,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        };
        break;
        
      default:
        return {
          success: false,
          error: `Unknown email template: ${template}`
        };
    }
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to generate verification token
export const generateVerificationToken = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Helper function to generate verification link
export const generateVerificationLink = (token) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${baseUrl}/verify-email/${token}`;
};
