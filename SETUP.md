# TrustTeams Backend Setup Guide

## Prerequisites
- Node.js (v14 or higher)
- MySQL database (Aiven MySQL recommended)
- Git

## Installation

1. Clone the repository:
```bash
git clone https://github.com/zrn2003/trustteams-backend.git
cd trustteams-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy one of the template files:
     - `setup-aiven-env.bat.template` → `setup-aiven-env.bat` (for Aiven MySQL)
     - `setup-trustteams-env.bat.template` → `setup-trustteams-env.bat` (for trustteams database)
   - Edit the file and replace the placeholder values with your actual database credentials
   - Run the setup script to create the `.env` file

4. Set up the database:
   - Copy `setup-aiven-db.ps1.template` → `setup-aiven-db.ps1`
   - Edit the file and replace the placeholder values with your actual database credentials
   - Run the PowerShell script to set up the database schema

5. Start the server:
```bash
npm start
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database Configuration
DB_HOST=your_database_host
DB_PORT=your_database_port
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# Server Configuration
PORT=3001
NODE_ENV=development

# Optional: Logging
LOG_LEVEL=info

# Optional: Security
SESSION_SECRET=your-session-secret-key

# Optional: Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## API Endpoints

The server runs on `http://localhost:3001` by default.

## Security Note

⚠️ **Important**: Never commit actual database credentials to the repository. The template files are provided as examples only. Always use environment variables for sensitive information.
