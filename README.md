# TrustTeams Backend API

A Node.js + Express backend for the TrustTeams collaboration platform, featuring user authentication and opportunity management.

## Features

- **User Authentication**: Signup, login, and profile management
- **Opportunity Management**: CRUD operations for collaboration opportunities
- **Search & Filtering**: Advanced search with full-text search capabilities
- **Audit Trail**: Complete audit logging for all opportunity changes
- **Role-based Access**: Admin, Manager, and Viewer roles
- **Aiven Cloud Database**: MySQL database hosted on Aiven Cloud

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL (Aiven Cloud)
- **ORM**: mysql2 (promise-based)
- **Authentication**: Plaintext password comparison (as requested)
- **CORS**: Cross-origin resource sharing enabled

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Access to Aiven MySQL database

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the backend directory:
   ```env
   DB_HOST=your-db-host
   DB_PORT=your-db-port
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   DB_NAME=defaultdb
   PORT=3001
   CORS_ORIGIN=http://localhost:5173
   ```
   ```

4. **Database Setup**
   
   The database schema and seed data are automatically created when the server starts. If you need to manually set up the database:
   
   ```bash
   # Connect to your MySQL database and run:
   mysql -h <host> -P <port> -u <user> -p < database_name < sql/schema.sql
   mysql -h <host> -P <port> -u <user> -p < database_name < sql/seed.sql
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:3001` (or the next available port if 3001 is busy).

## API Endpoints

### Authentication

#### POST `/api/auth/signup`
Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "viewer"
  }
}
```

#### POST `/api/auth/login`
Authenticate user and get session information.

**Request Body:**
```json
{
  "email": "admin@trustteams.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@trustteams.com",
    "role": "admin"
  }
}
```

#### GET `/api/auth/me`
Get current user profile (requires `x-user-id` header).

#### PUT `/api/auth/profile`
Update user profile (requires `x-user-id` header).

### Opportunities

#### GET `/api/opportunities`
Get all opportunities with search, filtering, and pagination.

**Query Parameters:**
- `search`: Search term for title/description
- `status`: Filter by status (open/closed)
- `type`: Filter by type (internship/job/research/other)
- `location`: Filter by location
- `sortBy`: Sort field (created_at/title/closing_date/status/type)
- `sortOrder`: Sort direction (ASC/DESC)
- `limit`: Number of results per page (default: 10)
- `offset`: Number of results to skip (default: 0)

#### POST `/api/opportunities`
Create a new opportunity (requires `x-user-id` header).

**Request Body:**
```json
{
  "title": "Software Engineering Internship",
  "type": "internship",
  "description": "Join our dynamic team...",
  "location": "New York, NY",
  "status": "open",
  "closingDate": "2024-12-31"
}
```

#### GET `/api/opportunities/:id`
Get a specific opportunity.

#### PUT `/api/opportunities/:id`
Update an opportunity (requires `x-user-id` header).

#### DELETE `/api/opportunities/:id`
Soft delete an opportunity (requires `x-user-id` header).

#### GET `/api/opportunities/:id/audit`
Get audit trail for an opportunity.

### Health Check

#### GET `/api/health`
Check API health status.

## Database Schema

### Users Table
- `id`: Primary key
- `name`: User's full name
- `email`: Unique email address
- `password`: Plaintext password (as requested)
- `role`: User role (admin/manager/viewer)
- `is_active`: Account status
- `last_login`: Last login timestamp
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

### Opportunities Table
- `id`: Primary key
- `title`: Opportunity title
- `type`: Type (internship/job/research/other)
- `description`: Detailed description
- `location`: Location information
- `status`: Status (open/closed)
- `closing_date`: Application deadline
- `posted_by`: User ID who posted
- `deleted_at`: Soft delete timestamp
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Opportunity Audit Table
- `id`: Primary key
- `opportunity_id`: Reference to opportunity
- `action`: Action performed (CREATE/UPDATE/DELETE)
- `changed_by`: User ID who made the change
- `old_values`: Previous values (JSON)
- `new_values`: New values (JSON)
- `created_at`: Audit timestamp

## Login Credentials

### Demo Accounts

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| `admin@trustteams.com` | `admin123` | Admin | Full access to all features |
| `manager@trustteams.com` | `manager123` | Manager | Can post and manage opportunities |
| `viewer@trustteams.com` | `viewer123` | Viewer | Read-only access to opportunities |
| `john@example.com` | `password123` | Viewer | Sample user account |
| `jane@example.com` | `password123` | Manager | Sample manager account |

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running in Production Mode
```bash
npm start
```

### Port Configuration
The server automatically tries ports starting from 3001. If a port is busy, it will try the next available port.

### Error Handling
- All endpoints include proper error handling
- Database connection errors are logged
- Invalid requests return appropriate HTTP status codes

## Security Notes

⚠️ **Important**: This implementation uses plaintext passwords as specifically requested. In a production environment, passwords should be hashed using bcrypt or similar.

## License

MIT License


