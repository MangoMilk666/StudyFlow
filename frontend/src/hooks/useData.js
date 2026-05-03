import { useEffect, useMemo, useState } from 'react'

import { useI18n } from '../i18n'

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
    {
      id: 't5',
      userId: 'demo_user',
      name: 'Write ancient book preservation lab report',
      deadline: '2026-03-22',
      module: 'Research',
      priority: 'M',
      status: 'todo',
      createdAt: '2026-03-20 09:10',
    },
    {
      id: 't6',
      userId: 'demo_user',
      name: 'Call family',
      deadline: '2026-03-20',
      module: 'Life',
      priority: 'L',
      status: 'todo',
      createdAt: '2026-03-19 21:30',
    },
    {
      id: 't7',
      userId: 'demo_user',
      name: 'it5007 project development',
      deadline: '2026-03-28',
      module: 'it5007',
      priority: 'H',
      status: 'in_progress',
      createdAt: '2026-03-19 10:05',
    },
  ]
}

function localizeDemoTask(task, t) {
  if (!task || task.userId !== 'demo_user') return task

  if (task.id === 't1') {
    return { ...task, name: t('demo.tasks.kmpAlgo') }
  }
  if (task.id === 't2') {
    return { ...task, name: t('demo.tasks.it5003ps4') }
  }
  if (task.id === 't3') {
    return { ...task, name: t('demo.tasks.metaInterview'), module: t('demo.modules.jobSeeking') }
  }
  if (task.id === 't4') {
    return { ...task, name: t('demo.tasks.cs5223ps1') }
  }
  if (task.id === 't5') {
    return { ...task, name: t('demo.tasks.ancientReport'), module: t('demo.modules.research') }
  }
  if (task.id === 't6') {
    return { ...task, name: t('demo.tasks.callFamily'), module: t('demo.modules.life') }
  }
  if (task.id === 't7') {
    return { ...task, name: t('demo.tasks.it5007Project') }
  }
  return task
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
  const { t, lang } = useI18n()
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    if (!userId) return

    const stored = localStorage.getItem(LS_TASKS_KEY)
    if (stored) {
      let parsed = []
      try {
        parsed = JSON.parse(stored)
      } catch {
        parsed = []
      }

      if (userId === 'demo_user' && Array.isArray(parsed)) {
        const seed = defaultTasks()
        const seedIds = new Set(seed.map((x) => x.id))
        const existingIds = new Set(parsed.map((x) => x?.id).filter(Boolean))

        const looksLikeDemoList =
          parsed.length > 0 && parsed.every((x) => x?.userId === 'demo_user') && parsed.some((x) => seedIds.has(x?.id))

        if (looksLikeDemoList) {
          const newSeedIds = new Set(['t5', 't6', 't7'])
          const missing = seed.filter((x) => newSeedIds.has(x.id) && !existingIds.has(x.id))
          if (missing.length) {
            parsed = [...parsed, ...missing]
            try {
              localStorage.setItem(LS_TASKS_KEY, JSON.stringify(parsed))
            } catch {
              // ignore
            }
          }
        }
      }

      setTasks(Array.isArray(parsed) ? parsed : [])
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

  const localizedTasksForUser = useMemo(() => {
    if (userId !== 'demo_user') return tasksForUser
    return tasksForUser.map((x) => localizeDemoTask(x, t))
  }, [lang, t, tasksForUser, userId])

  return { tasks: localizedTasksForUser, addTask, removeTask, updateTask, cycleStatus }
}
