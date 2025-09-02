import express from 'express'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

app.use(express.json())

// Basic CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id')
  next()
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/test', (req, res) => {
  res.json({ message: 'Simple server working' })
})

// Mock ICM endpoints for testing
app.get('/api/icm/universities', (req, res) => {
  res.json([
    { id: 1, name: 'Test University', email: 'test@uni.com', approval_status: 'approved' }
  ])
})

app.get('/api/icm/opportunities', (req, res) => {
  res.json([
    { id: 1, title: 'Test Opportunity', description: 'Test Description' }
  ])
})

app.get('/api/icm/stats', (req, res) => {
  res.json({
    totalOpportunities: 1,
    totalApplications: 0,
    recentActivity: 1
  })
})

app.get('/api/icm/profile', (req, res) => {
  res.json({
    id: 73,
    name: 'joy',
    email: 'shubhamshinde8111s@gmail.com',
    role: 'icm'
  })
})

const port = process.env.PORT || 3001

app.listen(port, () => {
  console.log(`Simple server listening on http://localhost:${port}`)
  console.log('✅ Server started successfully!')
})
