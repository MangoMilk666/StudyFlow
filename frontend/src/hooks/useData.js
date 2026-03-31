import { useEffect, useMemo, useState } from 'react'

const LS_USER_KEY = 'sf_user_v1'
const LS_TOKEN_KEY = 'sf_token_v1'
const LS_TASKS_KEY = 'sf_tasks_v1'

function nowText() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function defaultTasks() {
  return [
    {
      id: 't1',
      userId: 'demo_user',
      name: 'KMP Algo',
      deadline: '2026-03-20',
      module: 'it5003',
      priority: 'M',
      status: 'todo',
      createdAt: '2026-03-19 16:50',
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
    },
  ]
}

export const useAuth = () => {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem(LS_USER_KEY)
    if (stored) setUser(JSON.parse(stored))
  }, [])

  const login = (userData, token) => {
    localStorage.setItem(LS_USER_KEY, JSON.stringify(userData))
    localStorage.setItem(LS_TOKEN_KEY, token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem(LS_USER_KEY)
    localStorage.removeItem(LS_TOKEN_KEY)
    setUser(null)
  }

  return { user, login, logout, isAuthenticated: !!user }
}

export const useTasks = (userId) => {
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    if (!userId) return

    const stored = localStorage.getItem(LS_TASKS_KEY)
    if (stored) {
      setTasks(JSON.parse(stored))
      return
    }

    const seed = defaultTasks()
    localStorage.setItem(LS_TASKS_KEY, JSON.stringify(seed))
    setTasks(seed)
  }, [userId])

  useEffect(() => {
    if (!tasks.length) return
    localStorage.setItem(LS_TASKS_KEY, JSON.stringify(tasks))
  }, [tasks])

  const addTask = (partial) => {
    const id = `t_${Date.now()}`
    const createdAt = nowText()
    setTasks((prev) => [
      ...prev,
      {
        id,
        userId,
        name: partial.name || 'Untitled',
        deadline: partial.deadline || '2026-03-20',
        module: partial.module || 'it5007',
        priority: partial.priority || 'M',
        status: partial.status || 'todo',
        createdAt,
      },
    ])
  }

  const removeTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const updateTask = (id, patch) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const cycleStatus = (id) => {
    const order = ['todo', 'in_progress', 'review', 'done']
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const idx = Math.max(0, order.indexOf(t.status))
        return { ...t, status: order[(idx + 1) % order.length] }
      })
    )
  }

  const tasksForUser = useMemo(() => tasks.filter((t) => t.userId === userId), [tasks, userId])
  return { tasks: tasksForUser, addTask, removeTask, updateTask, cycleStatus }
}
