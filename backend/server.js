const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '.env') })
require('dotenv').config()
const cors = require('cors')
const express = require('express')
const mongoose = require('mongoose')

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const mockMode = process.env.MOCK_MODE === 'true'

if (mockMode) {
  const mockRouter = require('./routes/mock')
  app.use('/api', mockRouter)
} else {
  const authRoutes = require('./routes/auth')
  const taskRoutes = require('./routes/tasks')
  const moduleRoutes = require('./routes/modules')
  const timerRoutes = require('./routes/timer')
  const canvasRoutes = require('./routes/canvas')

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/studyflow'
  mongoose
    .connect(MONGO_URI, {
      serverSelectionTimeoutMS: 1500,
    })
    .then(() => console.log('✓ MongoDB connected'))
    .catch((err) => {
      console.error('✗ MongoDB connection error:', err.message)
      console.error('提示：如果你暂时不想启动 MongoDB，可用 MOCK_MODE=true 运行后端。')
    })

  app.get('/api/health', (req, res) => {
    res.json({ status: 'backend-running', timestamp: new Date().toISOString() })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/tasks', taskRoutes)
  app.use('/api/modules', moduleRoutes)
  app.use('/api/timer', timerRoutes)
  app.use('/api/canvas', canvasRoutes)
}

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal Server Error' })
})

const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

module.exports = app
