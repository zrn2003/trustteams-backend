// Email Configuration
export const emailConfig = {
  EMAIL_USER: process.env.EMAIL_USER || 'your-email@gmail.com',
  EMAIL_PASS: process.env.EMAIL_PASS || 'your-app-password',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173'
};

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
  CORS_ORIGIN: 'http://localhost:5173'
};
