import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../auth'
import { taskAPI } from '../services/api'
import { useTasks as useDemoTasks } from './useData'

function normalizeStatusToUi(status) {
  if (status === 'To Do' || status === 'todo') return 'todo'
  if (status === 'In Progress' || status === 'in_progress') return 'in_progress'
  if (status === 'Review' || status === 'review') return 'review'
  if (status === 'Done' || status === 'done') return 'done'
  return 'todo'
}

function normalizeStatusToApi(status) {
  if (status === 'todo' || status === 'To Do') return 'To Do'
  if (status === 'in_progress' || status === 'In Progress') return 'In Progress'
  if (status === 'review' || status === 'Review') return 'Review'
  if (status === 'done' || status === 'Done') return 'Done'
  return 'To Do'
}

function normalizeTaskApi(task) {
  return {
    id: task._id,
    name: task.title,
    deadline: task.deadline,
    module: task.moduleName || '',
    priority: task.priority,
    status: normalizeStatusToUi(task.status),
    createdAt: task.createdAt,
  }
}

export function useUnifiedTasks() {
  const { isAuthenticated } = useAuth()
  const demo = useDemoTasks('demo_user')

  const [apiTasks, setApiTasks] = useState([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    if (!isAuthenticated) return Promise.resolve()

    setLoading(true)
    return taskAPI
      .getAllTasks()
      .then((resp) => setApiTasks(resp.data || []))
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  useEffect(() => {
    refresh()
  }, [refresh])

  const tasks = useMemo(() => {
    if (!isAuthenticated) return demo.tasks
    return apiTasks.map(normalizeTaskApi)
  }, [apiTasks, demo.tasks, isAuthenticated])

  const cycleStatus = useCallback(
    async (id) => {
      const order = ['todo', 'in_progress', 'review', 'done']

      if (!isAuthenticated) {
        demo.cycleStatus(id)
        return
      }

      const current = tasks.find((t) => t.id === id)
      if (!current) return

      const idx = Math.max(0, order.indexOf(current.status))
      const next = order[(idx + 1) % order.length]

      await taskAPI.updateTaskStatus(id, normalizeStatusToApi(next))
      setApiTasks((prev) =>
        prev.map((x) => (x._id === id ? { ...x, status: normalizeStatusToApi(next) } : x))
      )
    },
    [demo, isAuthenticated, tasks]
  )

  return { tasks, loading, isAuthenticated, refresh, cycleStatus }
}

