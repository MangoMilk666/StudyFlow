import TopNav from '../components/TopNav'
import { useTasks } from '../hooks/useData'
import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { moduleAPI, taskAPI } from '../services/api'
import TaskModal from '../components/TaskModal'
import syncIcon from '../assets/streamline-plump-color--synchronize-flat.svg'
import { canvasAPI } from '../services/api'
import CanvasImportModal from '../components/CanvasImportModal'

function priorityClass(p) {
  if (p === 'H') return 'priority-h'
  if (p === 'M') return 'priority-m'
  return 'priority-l'
}

function toPriorityLetter(value) {
  if (value === 'High') return 'H'
  if (value === 'Medium') return 'M'
  if (value === 'Low') return 'L'
  if (value === 'H' || value === 'M' || value === 'L') return value
  return 'M'
}

function toPriorityApiValue(letter) {
  if (letter === 'H') return 'High'
  if (letter === 'L') return 'Low'
  return 'Medium'
}

function statusLabel(value, t) {
  if (value === 'To Do' || value === 'todo') return t('tasks.statusTodo')
  if (value === 'In Progress' || value === 'in_progress') return t('tasks.statusInProgress')
  if (value === 'Review' || value === 'review') return t('tasks.statusReview')
  if (value === 'Done' || value === 'done') return t('tasks.statusDone')
  return String(value || '')
}

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function getLocalDeviceTimestamp() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`
}

export default function TasksPage() {
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()

  const demo = useTasks('demo_user')
  const [apiTasks, setApiTasks] = useState([])
  const [moduleOptions, setModuleOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [canvasOpen, setCanvasOpen] = useState(false)
  const [courses, setCourses] = useState([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [previewAssignments, setPreviewAssignments] = useState([])

  useEffect(() => {
    if (!isAuthenticated) return

    let ignore = false
    setLoading(true)

    taskAPI
      .getAllTasks()
      .then((resp) => {
        if (ignore) return
        setApiTasks(resp.data || [])
      })
      .catch(() => {
        if (ignore) return
        setApiTasks([])
      })
      .finally(() => {
        if (ignore) return
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      setModuleOptions([])
      return
    }

    let ignore = false
    moduleAPI
      .getAllModules()
      .then((resp) => {
        if (ignore) return
        const names = (resp.data || [])
          .map((m) => String(m?.name || '').trim())
          .filter(Boolean)
        setModuleOptions(Array.from(new Set(names)))
      })
      .catch(() => {
        if (ignore) return
        setModuleOptions([])
      })

    return () => {
      ignore = true
    }
  }, [isAuthenticated])

  const rows = useMemo(() => {
    if (isAuthenticated) {
      return (apiTasks || []).map((task) => ({
        id: task._id,
        title: task.title,
        deadline: task.deadline,
        moduleName: task.moduleName || '',
        priority: toPriorityLetter(task.priority),
        status: task.status,
        createdAt: task.createdAt,
      }))
    }

    return demo.tasks.map((task) => ({
      id: task.id,
      title: task.name,
      deadline: task.deadline,
      moduleName: task.module,
      priority: task.priority,
      status: task.status,
      createdAt: task.createdAt,
    }))
  }, [apiTasks, demo.tasks, isAuthenticated])

  const selectableModules = useMemo(() => {
    const fromRows = rows.map((x) => String(x.moduleName || '').trim()).filter(Boolean)
    return Array.from(new Set([...moduleOptions, ...fromRows]))
  }, [moduleOptions, rows])

  const openNew = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setModalOpen(true)
  }

  const submitModal = async (form) => {
    setNotice(null)
    try {
      if (isAuthenticated) {
        const nowLocal = getLocalDeviceTimestamp()
        const payload = {
          title: form.title,
          deadline: form.deadline || null,
          moduleName: form.moduleName || '',
          priority: toPriorityApiValue(form.priority),
          createdAt: nowLocal,
          updatedAt: nowLocal,
        }

        if (editing?.id) {
          delete payload.createdAt
          const resp = await taskAPI.updateTask(editing.id, payload)
          setApiTasks((prev) => prev.map((x) => (x._id === editing.id ? resp.data : x)))
        } else {
          const resp = await taskAPI.createTask(payload)
          setApiTasks((prev) => [...prev, resp.data])
        }
      } else {
        if (editing?.id) {
          demo.updateTask(editing.id, {
            name: form.title,
            deadline: form.deadline || '',
            module: form.moduleName || '',
            priority: form.priority,
          })
        } else {
          demo.addTask({
            name: form.title,
            deadline: form.deadline || '2026-03-20',
            module: form.moduleName || 'it5007',
            priority: form.priority,
            status: 'todo',
          })
        }
      }

      setModalOpen(false)
      setEditing(null)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed'
      setNotice({ type: 'error', text: msg })
    }
  }

  const deleteRow = async (id) => {
    setNotice(null)

    if (isAuthenticated) {
      await taskAPI.deleteTask(id)
      setApiTasks((prev) => prev.filter((x) => x._id !== id))
      return
    }

    demo.removeTask(id)
  }

  const syncFromCanvas = async () => {
    setNotice(null)

    if (!isAuthenticated) {
      setNotice({ type: 'error', text: t('auth.loginRequired') })
      return
    }

    try {
      setSyncing(true)
      setCanvasOpen(true)
      setLoadingCourses(true)
      const resp = await canvasAPI.getCourses()
      setCourses(resp.data || [])
      setPreviewAssignments([])
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || t('tasks.syncFailed')
      setNotice({ type: 'error', text: msg })
      setCanvasOpen(false)
    } finally {
      setLoadingCourses(false)
      setSyncing(false)
    }
  }

  return (
    <div className="sf-page">
      <div className="main-frame">
        <TopNav />

        <div className="sf-scroll">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              padding: '0 10px',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="btn"
              style={{ background: 'var(--btn-add-bg)', borderWidth: 2, borderRadius: 10, padding: '10px 20px' }}
              onClick={openNew}
            >
              {t('tasks.addNew')}
            </button>

            <div style={{ fontSize: 14, fontWeight: 'bold' }}>
              {t('tasks.priorityLegendDemo')}
            </div>
          </div>

          {!isAuthenticated ? (
            <div style={{ margin: '0 10px 16px 10px', fontSize: 12, opacity: 0.75 }}>
              {t('tasks.previewNote')}
            </div>
          ) : null}

          {notice ? (
            <div
              style={{
                margin: '0 10px 16px 10px',
                border: `2px solid var(--ink)`,
                borderRadius: 14,
                padding: '10px 12px',
                background: notice.type === 'success' ? 'var(--panel-done)' : 'var(--btn-delete-bg)',
                fontWeight: 'bold',
              }}
            >
              {notice.text}
            </div>
          ) : null}

          <div style={{ border: `2px solid var(--ink)`, borderRadius: 20, overflow: 'hidden' }}>
            <div className="sf-xscroll">
              <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: `2px solid var(--ink)`, borderRight: '1px solid #ddd', padding: 15, background: '#fafafa' }}>
                      {t('tasks.title')}
                    </th>
                    <th style={{ borderBottom: `2px solid var(--ink)`, borderRight: '1px solid #ddd', padding: 15, background: '#fafafa' }}>
                      {t('tasks.deadline')}
                    </th>
                    <th style={{ borderBottom: `2px solid var(--ink)`, borderRight: '1px solid #ddd', padding: 15, background: '#fafafa' }}>
                      {t('tasks.module')}
                    </th>
                    <th style={{ borderBottom: `2px solid var(--ink)`, borderRight: '1px solid #ddd', padding: 15, background: '#fafafa' }}>
                      {t('tasks.priority')}
                    </th>
                    <th style={{ borderBottom: `2px solid var(--ink)`, borderRight: '1px solid #ddd', padding: 15, background: '#fafafa' }}>
                      {t('tasks.createdAt')}
                    </th>
                    <th style={{ borderBottom: `2px solid var(--ink)`, borderRight: '1px solid #ddd', padding: 15, background: '#fafafa' }}>
                      {t('tasks.status')}
                    </th>
                    <th style={{ borderBottom: `2px solid var(--ink)`, padding: 15, background: '#fafafa' }}>{t('tasks.operation')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12 }}>{row.title}</td>
                      <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12 }}>{formatDate(row.deadline)}</td>
                      <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12 }}>{row.moduleName}</td>
                      <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12 }}>
                        <span className={priorityClass(row.priority)}>{row.priority}</span>
                      </td>
                      <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12 }}>{formatDateTime(row.createdAt)}</td>
                      <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12 }}>{statusLabel(row.status, t)}</td>
                      <td style={{ borderBottom: '1px solid #eee', padding: 12 }}>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            style={{
                              border: `2px solid var(--ink)`,
                              borderRadius: 8,
                              padding: '5px 20px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              background: 'var(--btn-edit-bg)',
                            }}
                          >
                            {t('tasks.edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              deleteRow(row.id)
                            }}
                            style={{
                              border: `2px solid var(--ink)`,
                              borderRadius: 8,
                              padding: '5px 20px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              background: 'var(--btn-delete-bg)',
                            }}
                          >
                            {t('tasks.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!rows.length ? (
                    <tr>
                      <td colSpan={7} style={{ color: '#999', padding: 20 }}>
                        {loading ? t('tasks.loading') : t('tasks.noTasks')}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={syncFromCanvas}
          aria-label={t('tasks.syncButton')}
          title={t('tasks.syncButton')}
          disabled={syncing}
          className="sf-canvas-sync-fab"
        >
          <img src={syncIcon} alt="" style={{ width: 26, height: 26 }} />
        </button>
      </div>

      <TaskModal
        open={modalOpen}
        initial={editing}
        moduleOptions={selectableModules}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onSubmit={submitModal}
        t={t}
      />

      <CanvasImportModal
        open={canvasOpen}
        t={t}
        courses={courses}
        loadingCourses={loadingCourses}
        onClose={() => {
          if (previewing || confirming) return
          setCanvasOpen(false)
          setPreviewAssignments([])
        }}
        onPreview={async (courseIds) => {
          setNotice(null)
          try {
            setPreviewing(true)
            const resp = await canvasAPI.previewAssignments(courseIds)
            setPreviewAssignments(resp.data?.assignments || [])
          } catch (err) {
            const msg = err?.response?.data?.error || err?.message || t('tasks.syncFailed')
            setNotice({ type: 'error', text: msg })
          } finally {
            setPreviewing(false)
          }
        }}
        previewing={previewing}
        assignments={previewAssignments}
        onConfirm={async (courseIds) => {
          setNotice(null)
          try {
            setConfirming(true)
            await canvasAPI.importAssignments(courseIds)
            const refreshed = await taskAPI.getAllTasks()
            setApiTasks(refreshed.data || [])
            setNotice({ type: 'success', text: t('tasks.syncSuccess') })
            setCanvasOpen(false)
            setPreviewAssignments([])
          } catch (err) {
            const msg = err?.response?.data?.error || err?.message || t('tasks.syncFailed')
            setNotice({ type: 'error', text: msg })
          } finally {
            setConfirming(false)
          }
        }}
        confirming={confirming}
      />
    </div>
  )
}
