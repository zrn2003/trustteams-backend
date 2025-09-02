// Optional dotenv load without hard dependency
try {
  const dotenvModule = await import('dotenv')
  dotenvModule.config()
} catch (err) {
  // dotenv not installed or not needed
}
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import authRouter from './src/routes/auth.js'
import oppRouter from './src/routes/opportunities.js'
import studentRouter from './src/routes/student.js'
import pool from './src/db.js'
import debugRouter from './src/routes/debug.js'
import academicRouter from './src/routes/academic.js'
import universityRouter from './src/routes/university.js'
import applicationsRouter from './src/routes/applications.js'

const app = express()

// Enhanced CORS configuration
app.use(cors({ 
  origin: true, // Allow all origins for now to fix deployment
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-user-id'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
}))

// Simplified CORS middleware
app.use((req, res, next) => {
  // Set CORS headers for all responses
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, x-user-id')
  res.header('Access-Control-Allow-Credentials', 'true')
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  
  next()
})

app.use(express.json())
app.use(morgan('dev'))

// Root
app.get('/', (req, res) => {
  res.json({ service: 'trustteams-api', status: 'ok', version: '1.0.1' })
})

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({ 
    message: 'CORS test successful', 
    timestamp: new Date().toISOString(),
    origin: req.headers.origin,
    method: req.method
  })
})

// Simple test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working', 
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    origin: req.headers.origin || 'none'
  })
})

app.use('/api/auth', authRouter)
app.use('/api/opportunities', oppRouter)
app.use('/api/student', studentRouter)
app.use('/api/academic', academicRouter)
app.use('/api/university', universityRouter)
app.use('/api/applications', applicationsRouter)
app.use('/api/debug', debugRouter)

// 404 for API
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Not found' })
})

// Basic error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Server error' })
})

async function ensureStudentRoleEnum() {
  try {
    const [rows] = await pool.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`
    )
    const colType = rows?.[0]?.COLUMN_TYPE || ''
    const needsStudent = !/\b'student'\b/.test(colType)
    const needsAcademic = !/\b'academic_leader'\b/.test(colType)
    const needsUniversity = !/\b'university_admin'\b/.test(colType)
    if (!/enum\(/i.test(colType) || needsStudent || needsAcademic || needsUniversity) {
      console.warn("Updating users.role ENUM to include required roles…")
      await pool.query(
        "ALTER TABLE users MODIFY role ENUM('admin','manager','viewer','student','academic_leader','university_admin') NOT NULL DEFAULT 'student'"
      )
      console.log("users.role ENUM updated")
    } else {
      console.log("users.role ENUM already includes required roles")
    }
  } catch (e) {
    console.error('Failed to verify/update users.role ENUM:', e)
  }
}

const basePort = Number(process.env.PORT || 3001)
const maxPortAttempts = 5

function startServer(port, attemptsLeft) {
  const server = app
    .listen(port, async () => {
      console.log(`API listening on http://localhost:${port}`)
      try {
        const [rows] = await pool.query('SELECT 1 AS ok')
        if (rows && rows[0] && rows[0].ok === 1) {
          console.log('DB connection OK')
        }
      } catch (dbErr) {
        console.error('DB connection error:', dbErr && dbErr.code ? dbErr.code : dbErr)
      }

      // Run startup schema checks after server is ready
      await ensureStudentRoleEnum()
    })
    .on('error', (err) => {
      if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
        const nextPort = port + 1
        console.warn(`Port ${port} in use, retrying on ${nextPort}...`)
        startServer(nextPort, attemptsLeft - 1)
      } else {
        console.error('Failed to start server:', err)
        process.exit(1)
      }
    })

  // Graceful shutdown
  const shutdown = () => {
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

startServer(basePort, maxPortAttempts)


