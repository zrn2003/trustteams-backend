# Backend (Node + Express + MySQL)

This service exposes a simple auth API used by the frontend.

## Endpoints

- POST `/api/auth/login` { email, password }

## Setup

1) Install dependencies

```bash
cd backend
npm install
```

2) Configure environment

Create a `.env` file in `backend/`:

```
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=trustteams
```

3) Initialize database (local MySQL)

```bash
mysql -u root -p < sql/schema.sql
mysql -u root -p < sql/seed.sql
```

4) Run the API

```bash
npm run dev
```

It will start on http://localhost:3001


