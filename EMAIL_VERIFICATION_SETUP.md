# Email Verification Setup Guide

## Environment Variables Required

Create a `.env` file in the backend root directory with the following variables:

```bash
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Database Configuration
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name
DB_PORT=your-database-port

# Server Configuration
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

## Gmail App Password Setup

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Generate an App Password for "Mail"
4. Use the generated password in `EMAIL_PASS`

## Database Migration

Run the following SQL to add email verification columns:

```sql
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE AFTER email,
ADD COLUMN email_verification_token VARCHAR(255) NULL AFTER email_verified,
ADD COLUMN email_verification_expires DATETIME NULL AFTER email_verification_token;

ALTER TABLE users ADD INDEX idx_email_verification_token (email_verification_token);
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;
```

## Features

- **Email Verification**: All new users must verify their email before logging in
- **Verification Tokens**: Secure tokens with 24-hour expiration
- **Resend Verification**: Users can request new verification emails
- **Auto-Approval**: Students and academic leaders can create accounts directly
- **Welcome Emails**: Sent after successful verification
