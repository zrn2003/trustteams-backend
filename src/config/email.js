import nodemailer from 'nodemailer';
import { emailConfig } from '../../config.js';

const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailConfig.EMAIL_USER,
      pass: emailConfig.EMAIL_PASS
    }
  });
  return transporter;
};

const emailTemplates = {
  verification: (name, verificationLink) => ({
    subject: 'Verify Your Email - TrustTeams',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to TrustTeams!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${verificationLink}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>Best regards,<br>The TrustTeams Team</p>
      </div>
    `
  }),
  
  welcome: (name) => ({
    subject: 'Welcome to TrustTeams - Email Verified!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Welcome to TrustTeams!</h2>
        <p>Hi ${name},</p>
        <p>🎉 Your email has been successfully verified! You can now sign in to your account.</p>
        <p>We're excited to have you on board!</p>
        <p>Best regards,<br>The TrustTeams Team</p>
      </div>
    `
  })
};

export const sendEmail = async (to, template, params = []) => {
  try {
    const transporter = createTransporter();
    const emailTemplate = emailTemplates[template](...params);
    
    const mailOptions = {
      from: emailConfig.EMAIL_USER,
      to: to,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

export const generateVerificationToken = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36);
};

export const generateVerificationLink = (token) => {
  const baseUrl = emailConfig.FRONTEND_URL;
  return `${baseUrl}/verify-email?token=${token}`;
};
