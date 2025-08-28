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
import pool from './src/db.js'

const app = express()

// CORS configuration to allow both development and production origins
const allowedOrigins = [
  'http://localhost:5173', // Development
  'https://trustteams-frontend.vercel.app', // Production frontend
  'https://trustteams-frontend-git-main-zrn2003.vercel.app', // Vercel preview deployments
  'https://trustteams-frontend-git-develop-zrn2003.vercel.app' // Vercel branch deployments
]

app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true 
}))
app.use(express.json())
app.use(morgan('dev'))

// Root
app.get('/', (req, res) => {
  res.json({ service: 'trustteams-api', status: 'ok' })
})

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/opportunities', oppRouter)

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


