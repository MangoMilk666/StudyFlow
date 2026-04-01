const express = require('express')

const router = express.Router()

function nowIso() {
  return new Date().toISOString()
}

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

const state = {
  users: [
    {
      id: 'demo_user',
      username: 'demo',
      email: 'demo@studyflow.local',
      createdAt: nowIso(),
    },
  ],
  modules: [
    { id: 'm1', userId: 'demo_user', name: 'it5007', color: '#b0d4ff', createdAt: nowIso() },
    { id: 'm2', userId: 'demo_user', name: 'it5003', color: '#fff1b8', createdAt: nowIso() },
  ],
  tasks: [
    {
      id: 't1',
      userId: 'demo_user',
      name: 'KMP Algo',
      deadline: '2026-03-20',
      module: 'it5003',
      priority: 'M',
      status: 'todo',
      createdAt: '2026-03-19 16:50',
      timeSpentSec: 0,
    },
    {
      id: 't2',
      userId: 'demo_user',
      name: 'it5003 PS4',
      deadline: '2026-03-21',
      module: 'it5003',
      priority: 'H',
      status: 'in_progress',
      createdAt: '2026-03-19 08:20',
      timeSpentSec: 0,
    },
    {
      id: 't3',
      userId: 'demo_user',
      name: 'Meta Interview',
      deadline: '2026-03-19',
      module: 'Job Seeking',
      priority: 'H',
      status: 'review',
      createdAt: '2026-03-17 00:02',
      timeSpentSec: 0,
    },
    {
      id: 't4',
      userId: 'demo_user',
      name: 'cs5223 PS1',
      deadline: '2026-03-18',
      module: 'cs5223',
      priority: 'L',
      status: 'done',
      createdAt: '2026-03-16 11:30',
      timeSpentSec: 0,
    },
  ],
  timerLogs: [],
}

router.get('/health', (req, res) => {
  res.json({ status: 'mock-backend', timestamp: nowIso() })
})

router.post('/auth/register', (req, res) => {
  const { username, email } = req.body || {}
  if (!username || !email) {
    res.status(400).json({ error: 'username/email required' })
    return
  }

  const exists = state.users.some((u) => u.email === email)
  if (exists) {
    res.status(409).json({ error: 'email already registered' })
    return
  }

  const user = { id: id('u'), username, email, createdAt: nowIso() }
  state.users.push(user)

  res.json({ user, token: 'mock_token' })
})

router.post('/auth/login', (req, res) => {
  const { email } = req.body || {}
  const user = state.users.find((u) => u.email === email) || state.users[0]
  res.json({ user, token: 'mock_token' })
})

router.get('/tasks', (req, res) => {
  const userId = req.query.userId || 'demo_user'
  res.json(state.tasks.filter((t) => t.userId === userId))
})

router.post('/tasks', (req, res) => {
  const body = req.body || {}
  const task = {
    id: id('t'),
    userId: body.userId || 'demo_user',
    name: body.name || 'Untitled',
    deadline: body.deadline,
    module: body.module,
    priority: body.priority || 'M',
    status: body.status || 'todo',
    createdAt: body.createdAt || nowIso(),
    timeSpentSec: 0,
  }

  state.tasks.push(task)
  res.status(201).json(task)
})

router.get('/tasks/:id', (req, res) => {
  const task = state.tasks.find((t) => t.id === req.params.id)
  if (!task) {
    res.status(404).json({ error: 'not found' })
    return
  }

  res.json(task)
})

router.put('/tasks/:id', (req, res) => {
  const idx = state.tasks.findIndex((t) => t.id === req.params.id)
  if (idx < 0) {
    res.status(404).json({ error: 'not found' })
    return
  }

  state.tasks[idx] = { ...state.tasks[idx], ...(req.body || {}) }
  res.json(state.tasks[idx])
})

router.delete('/tasks/:id', (req, res) => {
  const before = state.tasks.length
  state.tasks = state.tasks.filter((t) => t.id !== req.params.id)
  if (state.tasks.length === before) {
    res.status(404).json({ error: 'not found' })
    return
  }

  res.status(204).end()
})

router.patch('/tasks/:id/status', (req, res) => {
  const idx = state.tasks.findIndex((t) => t.id === req.params.id)
  if (idx < 0) {
    res.status(404).json({ error: 'not found' })
    return
  }

  const { status } = req.body || {}
  state.tasks[idx] = { ...state.tasks[idx], status: status || state.tasks[idx].status }
  res.json(state.tasks[idx])
})

router.get('/modules', (req, res) => {
  const userId = req.query.userId || 'demo_user'
  res.json(state.modules.filter((m) => m.userId === userId))
})

router.post('/timer/start', (req, res) => {
  const { taskId, userId } = req.body || {}
  res.json({ ok: true, taskId, userId, startedAt: nowIso() })
})

router.post('/timer/stop', (req, res) => {
  const { taskId, userId, duration } = req.body || {}
  const log = {
    id: id('log'),
    taskId,
    userId,
    durationSec: Number(duration || 0),
    endTime: nowIso(),
  }
  state.timerLogs.push(log)
  res.json({ ok: true, log })
})

module.exports = router

