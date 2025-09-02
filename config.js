// Email Configuration
export const emailConfig = {
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://trustteams-frontend.vercel.app'
};

// Validate email configuration
if (!emailConfig.EMAIL_USER || !emailConfig.EMAIL_PASS) {
  console.warn('⚠️ Email configuration incomplete. Set EMAIL_USER and EMAIL_PASS environment variables.');
  console.warn('📧 Email verification will not work without proper configuration.');
}

// Database Configuration
export const dbConfig = {
  DB_HOST: process.env.DB_HOST || 'mysql-33253911-zishanrn2003-3cf2.j.aivencloud.com',
  DB_USER: process.env.DB_USER || 'avnadmin',
  DB_PASSWORD: process.env.DB_PASSWORD || 'your-database-password',
  DB_NAME: process.env.DB_NAME || 'trustteams',
  DB_PORT: process.env.DB_PORT || 22688
};

// Server Configuration
export const serverConfig = {
  PORT: 3001,
  NODE_ENV: 'development',
  JWT_SECRET: 'your-secret-key',
  JWT_EXPIRES_IN: '24h',
  CORS_ORIGIN: 'https://trustteams-frontend.vercel.app'
};
