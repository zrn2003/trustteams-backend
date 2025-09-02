import express from 'express'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/test', (req, res) => {
  res.json({ message: 'Test server working' })
})

const port = process.env.PORT || 3001

app.listen(port, () => {
  console.log(`Test server listening on http://localhost:${port}`)
})
