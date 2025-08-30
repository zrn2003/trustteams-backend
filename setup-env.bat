@echo off
echo Creating .env file for local development...

(
echo # Database Configuration ^(Local MySQL^)
echo DB_HOST=localhost
echo DB_PORT=3306
echo DB_USER=root
echo DB_PASSWORD=
echo DB_NAME=trustteams
echo.
echo # Server Configuration
echo PORT=3001
echo NODE_ENV=development
echo.
echo # Optional: Logging
echo LOG_LEVEL=info
echo.
echo # Optional: Security
echo SESSION_SECRET=your-session-secret-key
echo.
echo # Optional: Rate Limiting
echo RATE_LIMIT_WINDOW_MS=900000
echo RATE_LIMIT_MAX_REQUESTS=100
) > .env

echo .env file created successfully!
echo.
echo Next steps:
echo 1. Update the DB_PASSWORD if your MySQL has a password
echo 2. Run the database setup script
echo 3. Start the backend server
pause
