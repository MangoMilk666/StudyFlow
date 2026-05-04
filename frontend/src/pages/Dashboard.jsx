import { useEffect, useState } from 'react'
import TopNav from '../components/TopNav'
import DoneTaskActionModal from '../components/DoneTaskActionModal'
import { useApiHealth } from '../hooks/useApiHealth'
import { useI18n } from '../i18n'
import { useUnifiedTasks } from '../hooks/useUnifiedTasks'
import { statsAPI, taskAPI } from '../services/api'

function Panel({ title, color, tasks, onTaskClick, isAuthenticated, pomodoroCounts, hoveredTaskId, onHoverPomodoro, onLeavePomodoro, clickHint }) {
  const { t: tr } = useI18n()

  return (
    <section
      style={{
        border: `3px solid var(--ink)`,
        borderRadius: 30,
        padding: 20,
        minHeight: 220,
        background: color,
      }}
    >
      <h2 style={{ textAlign: 'center', fontSize: 24, margin: '0 0 18px 0' }}>{title}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'flex-start' }}>
        {tasks.length ? (
          tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onTaskClick(task.id)}
              style={{
                background: 'white',
                border: `2px solid var(--ink)`,
                borderRadius: 999,
                padding: '14px 20px',
                minWidth: 110,
                textAlign: 'center',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
              title={clickHint || tr('dashboard.clickHint')}
            >
              <span style={{ flex: '1 1 auto', textAlign: 'left' }}>{task.name}</span>
              {(() => {
                const count = Number(pomodoroCounts?.[task.id] || 0)
                const showCount = isAuthenticated && hoveredTaskId === task.id
                return (
              <span
                role="button"
                tabIndex={0}
                onMouseEnter={() => onHoverPomodoro(task.id)}
                onMouseLeave={() => onLeavePomodoro(task.id)}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{
                  flex: '0 0 auto',
                  border: `2px solid var(--ink)`,
                  borderRadius: 999,
                  padding: '6px 10px',
                  background: 'white',
                  fontWeight: 'bold',
                  fontSize: 12,
                  opacity: showCount ? 1 : 0.6,
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  minWidth: 68,
                  textAlign: 'center',
                  display: 'inline-flex',
                  justifyContent: 'center',
                }}
                title={isAuthenticated ? `🍅 x${count}` : undefined}
              >
                <span>🍅</span>
                <span style={{ visibility: showCount ? 'visible' : 'hidden' }}>{` x${count}`}</span>
              </span>
                )
              })()}
            </button>
          ))
        ) : (
          <div style={{ opacity: 0.6, fontWeight: 'bold' }}>{tr('dashboard.noTasks')}</div>
        )}
      </div>
    </section>
  )
}

export default function Dashboard() {
  const { tasks, cycleStatus, isAuthenticated, refresh } = useUnifiedTasks()
  useApiHealth()
  const { t: tr } = useI18n()
  const [authFlash, setAuthFlash] = useState(null)
  const [notice, setNotice] = useState(null)
  const [pomodoroCounts, setPomodoroCounts] = useState({})
  const [hoveredTaskId, setHoveredTaskId] = useState(null)
  const [doneActionTask, setDoneActionTask] = useState(null)
  const [doneActionLoading, setDoneActionLoading] = useState(false)

  useEffect(() => {
    try {
      const v = sessionStorage.getItem('sf_auth_flash')
      if (v === 'login_ok' || v === 'register_ok') {
        setAuthFlash(v)
        sessionStorage.removeItem('sf_auth_flash')
      }
    } catch {
      setAuthFlash(null)
    }
  }, [])

  const byStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    review: tasks.filter((t) => t.status === 'review'),
    done: tasks.filter((t) => t.status === 'done'),
  }

  const onHoverPomodoro = (taskId) => {
    if (!isAuthenticated) return
    setHoveredTaskId((prev) => (prev === taskId ? prev : taskId))
    if (pomodoroCounts?.[taskId] != null) return
    statsAPI
      .getTaskStats(taskId)
      .then((resp) => {
        const v = Number(resp?.data?.pomodorosCompleted || 0)
        setPomodoroCounts((prev) => ({ ...prev, [taskId]: Number.isFinite(v) ? v : 0 }))
      })
      .catch(() => setPomodoroCounts((prev) => ({ ...prev, [taskId]: 0 })))
  }

  const onLeavePomodoro = (taskId) => {
    setHoveredTaskId((prev) => (prev === taskId ? null : prev))
  }

  const onDoneTaskClick = async (taskId) => {
    setNotice(null)
    if (!isAuthenticated) {
      setNotice({ type: 'error', text: tr('auth.loginRequired') })
      return
    }
    const t = tasks.find((x) => x.id === taskId)
    if (!t) return
    setDoneActionTask(t)
  }

  const closeDoneModal = () => {
    if (doneActionLoading) return
    setDoneActionTask(null)
  }

  const archiveDoneTask = async () => {
    if (!doneActionTask) return
    setDoneActionLoading(true)
    try {
      await taskAPI.archiveTask(doneActionTask.id)
      await refresh()
      setDoneActionTask(null)
      setNotice({ type: 'success', text: tr('archive.archived') })
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || tr('archive.failed')
      setNotice({ type: 'error', text: msg })
    } finally {
      setDoneActionLoading(false)
    }
  }

  const restoreDoneTask = async () => {
    if (!doneActionTask) return
    setDoneActionLoading(true)
    try {
      await taskAPI.restoreTask(doneActionTask.id)
      await refresh()
      setDoneActionTask(null)
      setNotice({ type: 'success', text: tr('archive.restored') })
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || tr('archive.failed')
      setNotice({ type: 'error', text: msg })
    } finally {
      setDoneActionLoading(false)
    }
  }

  return (
    <div className="sf-page">
      <div className="main-frame">
        <TopNav />

        <div className="sf-scroll">
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
          <main
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 30,
            }}
          >
            <Panel
              title={tr('dashboard.todo')}
              color="var(--panel-todo)"
              tasks={byStatus.todo}
              onTaskClick={cycleStatus}
              isAuthenticated={isAuthenticated}
              pomodoroCounts={pomodoroCounts}
              hoveredTaskId={hoveredTaskId}
              onHoverPomodoro={onHoverPomodoro}
              onLeavePomodoro={onLeavePomodoro}
            />
            <Panel
              title={tr('dashboard.inProgress')}
              color="var(--panel-progress)"
              tasks={byStatus.in_progress}
              onTaskClick={cycleStatus}
              isAuthenticated={isAuthenticated}
              pomodoroCounts={pomodoroCounts}
              hoveredTaskId={hoveredTaskId}
              onHoverPomodoro={onHoverPomodoro}
              onLeavePomodoro={onLeavePomodoro}
            />
            <Panel
              title={tr('dashboard.review')}
              color="var(--panel-review)"
              tasks={byStatus.review}
              onTaskClick={cycleStatus}
              isAuthenticated={isAuthenticated}
              pomodoroCounts={pomodoroCounts}
              hoveredTaskId={hoveredTaskId}
              onHoverPomodoro={onHoverPomodoro}
              onLeavePomodoro={onLeavePomodoro}
            />
            <Panel
              title={tr('dashboard.done')}
              color="var(--panel-done)"
              tasks={byStatus.done}
              onTaskClick={onDoneTaskClick}
              isAuthenticated={isAuthenticated}
              pomodoroCounts={pomodoroCounts}
              hoveredTaskId={hoveredTaskId}
              onHoverPomodoro={onHoverPomodoro}
              onLeavePomodoro={onLeavePomodoro}
              clickHint={tr('archive.modalHint')}
            />
          </main>

          {!isAuthenticated ? (
            <div style={{ marginTop: 18, fontSize: 12, opacity: 0.85, fontWeight: 'bold' }}>
              {tr('common.loginMore')}
            </div>
          ) : null}
        </div>

        <DoneTaskActionModal
          open={!!doneActionTask}
          taskName={doneActionTask?.name}
          onArchive={archiveDoneTask}
          onRestore={restoreDoneTask}
          onClose={closeDoneModal}
          loading={doneActionLoading}
        />

        {authFlash ? (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              zIndex: 90,
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setAuthFlash(null)
            }}
          >
            <div
              style={{
                width: 'min(520px, 100%)',
                background: 'white',
                border: `3px solid var(--ink)`,
                borderRadius: 24,
                padding: 18,
                boxShadow: '10px 10px 0 rgba(0,0,0,0.15)',
              }}
            >
              <h2 style={{ margin: '0 0 10px 0', textAlign: 'center' }}>
                {authFlash === 'login_ok' ? tr('auth.loginOkPopup') : tr('auth.registerOkPopup')}
              </h2>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
                <button
                  className="btn"
                  type="button"
                  style={{ background: 'var(--btn-add-bg)' }}
                  onClick={() => setAuthFlash(null)}
                >
                  {tr('common.ok')}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
