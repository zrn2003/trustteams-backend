# 📧 Email Setup Guide for TrustTeams

## 🚀 Quick Setup (5 minutes)

### Step 1: Enable 2-Factor Authentication on Gmail
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click on "Security"
3. Enable "2-Step Verification" if not already enabled

### Step 2: Generate Gmail App Password
1. Go to [Google Account Settings > Security](https://myaccount.google.com/security)
2. Click on "2-Step Verification"
3. Scroll down and click "App passwords"
4. Select "Mail" and "Other (Custom name)"
5. Enter "TrustTeams" as the name
6. Click "Generate"
7. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### Step 3: Set Environment Variables

#### Option A: Local Development (.env file)
Create a `.env` file in your `trustteams-backend` folder:

```bash
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
FRONTEND_URL=https://trustteams-frontend.vercel.app
```

#### Option B: Vercel Production
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `trustteams-backend` project
3. Go to "Settings" > "Environment Variables"
4. Add these variables:
   - `EMAIL_USER`: `your-email@gmail.com`
   - `EMAIL_PASS`: `abcd efgh ijkl mnop`
   - `FRONTEND_URL`: `https://trustteams-frontend.vercel.app`

### Step 4: Test Email Functionality
After deployment, test the email verification:
1. Sign up with a new account
2. Check if verification email is received
3. Verify the email link works

## 🔧 Troubleshooting

### Common Issues:

#### ❌ "Invalid login" error
- Make sure you're using the **App Password**, not your regular Gmail password
- Ensure 2-Factor Authentication is enabled
- Check that the email address is correct

#### ❌ "Less secure app access" error
- This is normal and expected
- Gmail App Passwords are designed for this use case
- No additional settings needed

#### ❌ Emails not sending
- Check Vercel logs for error messages
- Verify environment variables are set correctly
- Ensure the email address exists and is valid

## 📱 Email Templates Available

The system includes these email templates:
- **Verification Email**: Sent when users sign up
- **Welcome Email**: Sent after email verification
- **Customizable**: HTML templates in `src/config/email.js`

## 🛡️ Security Notes

- **Never commit** your `.env` file to git
- **App Passwords** are more secure than regular passwords
- **Environment variables** are encrypted in Vercel
- **Rate limiting** is implemented to prevent abuse

## 🎯 Next Steps

1. Follow the setup steps above
2. Test with a local `.env` file first
3. Deploy to Vercel with environment variables
4. Test email functionality in production

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify environment variables are set
3. Test with a simple email first
4. Check Gmail account settings

---

**Note**: This setup uses Gmail's SMTP service. For production use, consider using dedicated email services like SendGrid, Mailgun, or AWS SES for better deliverability and monitoring.
