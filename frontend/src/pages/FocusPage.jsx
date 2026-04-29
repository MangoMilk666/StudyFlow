import { useEffect, useMemo, useRef, useState } from 'react'
import TopNav from '../components/TopNav'
import { useI18n } from '../i18n'
import { useUnifiedTasks } from '../hooks/useUnifiedTasks'
import { useAuth } from '../auth'
import { statsAPI, taskAPI, timerAPI } from '../services/api'

const LS_FOCUS_TIMER_KEY = 'sf_focus_timer_v1'
const DEFAULT_SECONDS = 25 * 60

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FocusPage() {
  const { tasks, refresh, isAuthenticated, loading } = useUnifiedTasks()
  useAuth()
  const { t } = useI18n()

  const [currentTaskId, setCurrentTaskId] = useState('')

  const [timeLeft, setTimeLeft] = useState(DEFAULT_SECONDS)
  const [isRunning, setIsRunning] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [notice, setNotice] = useState(null)
  const [resultText, setResultText] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const runStartMsRef = useRef(null)
  const runBaseLeftRef = useRef(DEFAULT_SECONDS)
  const stopOnceRef = useRef(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_FOCUS_TIMER_KEY)
      if (!raw) {
        return
      }
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') {
        return
      }

      const savedTimeLeft = Number(parsed.timeLeft)
      const savedRunning = !!parsed.isRunning
      const savedHasStarted = !!parsed.hasStarted
      const savedUpdatedAt = Number(parsed.updatedAtMs)

      const safeTimeLeft = Number.isFinite(savedTimeLeft) ? Math.max(0, Math.floor(savedTimeLeft)) : DEFAULT_SECONDS
      const nowMs = Date.now()
      const elapsedSec =
        savedRunning && Number.isFinite(savedUpdatedAt) ? Math.max(0, Math.floor((nowMs - savedUpdatedAt) / 1000)) : 0
      const nextLeft = Math.max(0, safeTimeLeft - elapsedSec)

      setTimeLeft(nextLeft)
      setIsRunning(savedRunning && nextLeft > 0)
      setHasStarted(savedHasStarted || savedRunning)

      const c = String(parsed.currentTaskId || '')
      if (c) setCurrentTaskId(c)

      runBaseLeftRef.current = nextLeft
      runStartMsRef.current = savedRunning ? nowMs : null
    } catch {
      // ignore
    } finally {
      setHydrated(true)
    }
  }, [])

  const currentTask = useMemo(() => tasks.find((t) => t.id === currentTaskId), [tasks, currentTaskId])
  const selectableTasks = useMemo(() => tasks.filter((x) => x.status === 'todo' || x.status === 'in_progress'), [tasks])

  useEffect(() => {
    if (!hydrated) return
    if (loading) return
    if (!currentTaskId) return
    const stillSelectable = selectableTasks.some((x) => x.id === currentTaskId)
    if (stillSelectable) return

    setCurrentTaskId('')
    setIsRunning(false)
    setHasStarted(false)
    setTimeLeft(DEFAULT_SECONDS)
    stopOnceRef.current = false
    runStartMsRef.current = null
    runBaseLeftRef.current = DEFAULT_SECONDS
  }, [currentTaskId, hydrated, loading, selectableTasks])

  useEffect(() => {
    if (!isRunning) return

    const id = window.setInterval(() => {
      const startMs = runStartMsRef.current
      const baseLeft = runBaseLeftRef.current
      if (!startMs) return
      const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000))
      const nextLeft = Math.max(0, baseLeft - elapsed)
      setTimeLeft(nextLeft)
    }, 250)

    return () => window.clearInterval(id)
  }, [isRunning])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(
        LS_FOCUS_TIMER_KEY,
        JSON.stringify({
          currentTaskId,
          timeLeft,
          isRunning,
          hasStarted,
          updatedAtMs: Date.now(),
        })
      )
    } catch {
      // ignore
    }
  }, [currentTaskId, hydrated, timeLeft, isRunning, hasStarted])

  useEffect(() => {
    if (!isRunning) return
    if (timeLeft !== 0) return
    if (stopOnceRef.current) return
    stopOnceRef.current = true
    setIsRunning(false)

    const taskId = String(currentTaskId || '')
    if (!taskId) return
    if (!isAuthenticated) return

    timerAPI
      .stopTimer(taskId, DEFAULT_SECONDS, 'completed')
      .then(() => statsAPI.getTaskStats(taskId))
      .then((resp) => {
        const minutes = Number(resp?.data?.totalMinutes || 0)
        setResultText(`${t('focus.congrats')} ${t('focus.totalFocused', minutes)}`)
      })
      .catch(() => {})
  }, [currentTaskId, isAuthenticated, isRunning, timeLeft, t])

  const primaryLabel = useMemo(() => {
    if (isRunning) return t('focus.pause')
    if (!hasStarted) return t('focus.start')
    return t('focus.resume')
  }, [hasStarted, isRunning, t])

  const stopAndRecordInterrupted = async () => {
    if (!currentTaskId) {
      setNotice({ type: 'error', text: t('focus.selectTaskFirst') })
      return
    }
    if (!isAuthenticated) {
      setNotice({ type: 'error', text: t('auth.loginRequired') })
      return
    }

    const ok = window.confirm(t('focus.stopConfirm'))
    if (!ok) return

    let effectiveLeft = timeLeft
    if (isRunning) {
      const startMs = runStartMsRef.current
      const baseLeft = runBaseLeftRef.current
      const elapsed = startMs ? Math.max(0, Math.floor((Date.now() - startMs) / 1000)) : 0
      const nextLeft = Math.max(0, baseLeft - elapsed)
      setTimeLeft(nextLeft)
      setIsRunning(false)
      runStartMsRef.current = null
      runBaseLeftRef.current = nextLeft
      effectiveLeft = nextLeft
    }

    const spent = Math.max(0, DEFAULT_SECONDS - Math.max(0, effectiveLeft))
    if (spent > 0) {
      try {
        await timerAPI.stopTimer(currentTaskId, spent, 'interrupted')
        const resp = await statsAPI.getTaskStats(currentTaskId)
        const minutes = Number(resp?.data?.totalMinutes || 0)
        setResultText(t('focus.totalFocused', minutes))
      } catch {
        // ignore
      }
    }

    setHasStarted(false)
    setTimeLeft(DEFAULT_SECONDS)
    stopOnceRef.current = false
  }

  return (
    <div className="sf-page">
      <div className="main-frame">
        <TopNav />

        <div className="sf-scroll">
          <main
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: 40,
              alignItems: 'center',
            }}
          >
            <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: 420,
                  height: 420,
                  border: `15px solid #a9d6ff`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: 64, fontWeight: 'bold' }}>{formatTime(timeLeft)}</div>
              </div>

              <div style={{ display: 'flex', gap: 40, marginTop: -60, zIndex: 10 }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    stopAndRecordInterrupted()
                  }}
                  style={{ background: '#f0f0f0' }}
                >
                  {t('focus.stop')}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setNotice(null)
                    setResultText('')
                    stopOnceRef.current = false

                    if (!currentTaskId) {
                      setNotice({ type: 'error', text: t('focus.selectTaskFirst') })
                      return
                    }

                    if (isRunning) {
                      const startMs = runStartMsRef.current
                      const baseLeft = runBaseLeftRef.current
                      const elapsed = startMs ? Math.max(0, Math.floor((Date.now() - startMs) / 1000)) : 0
                      const nextLeft = Math.max(0, baseLeft - elapsed)
                      setTimeLeft(nextLeft)
                      setIsRunning(false)
                      runStartMsRef.current = null
                      runBaseLeftRef.current = nextLeft
                      return
                    }

                    setHasStarted(true)
                    if (timeLeft <= 0) setTimeLeft(DEFAULT_SECONDS)
                    runBaseLeftRef.current = timeLeft <= 0 ? DEFAULT_SECONDS : timeLeft
                    runStartMsRef.current = Date.now()
                    setIsRunning(true)
                  }}
                  style={{ background: '#ffcf9f' }}
                >
                  {primaryLabel}
                </button>
              </div>

              <div style={{ marginTop: 26, fontSize: 12, opacity: 0.8, textAlign: 'center' }}>
                {t('focus.skeletonNote')}
              </div>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
              {notice ? (
                <div
                  style={{
                    border: `2px solid var(--ink)`,
                    borderRadius: 14,
                    padding: '10px 12px',
                    background: 'var(--btn-delete-bg)',
                    fontWeight: 'bold',
                  }}
                >
                  {notice.text}
                </div>
              ) : null}

              {resultText ? (
                <div
                  style={{
                    border: `3px solid var(--ink)`,
                    borderRadius: 18,
                    padding: '12px 14px',
                    background: 'white',
                    fontWeight: 'bold',
                    textAlign: 'center',
                  }}
                >
                  {resultText}
                </div>
              ) : null}

              <div
                style={{
                  border: `3px solid var(--ink)`,
                  borderRadius: 30,
                  padding: 30,
                  textAlign: 'center',
                  background: 'var(--panel-progress)',
                }}
              >
                <h3 style={{ margin: 0, fontSize: 28, marginBottom: 16 }}>{t('focus.currentTask')}</h3>
                <p style={{ fontSize: 24, margin: 0, fontWeight: 'bold' }}>
                  {currentTask?.name || t('focus.unselected')}
                </p>
                <div style={{ marginTop: 14 }}>
                  <select
                    value={currentTaskId}
                    onChange={(e) => {
                      const hasActiveSession = isRunning || (hasStarted && timeLeft > 0 && timeLeft < DEFAULT_SECONDS)
                      if (hasActiveSession) {
                        setNotice({ type: 'error', text: t('focus.stopBeforeDone') })
                        return
                      }
                      const next = e.target.value
                      setCurrentTaskId(next)
                      setIsRunning(false)
                      setTimeLeft(DEFAULT_SECONDS)
                      setHasStarted(false)
                      stopOnceRef.current = false
                      runStartMsRef.current = null
                      runBaseLeftRef.current = DEFAULT_SECONDS
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: `2px solid var(--ink)`,
                      width: '100%',
                      maxWidth: 360,
                      fontWeight: 'bold',
                    }}
                  >
                    <option value="">{t('focus.unselected')}</option>
                    {selectableTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
                  <button
                    className="btn"
                    type="button"
                    style={{ background: 'var(--btn-add-bg)', padding: '10px 18px', fontSize: 16 }}
                    onClick={async () => {
                      setNotice(null)
                      if (!isAuthenticated) {
                        setNotice({ type: 'error', text: t('auth.loginRequired') })
                        return
                      }
                      const hasActiveSession = isRunning || (hasStarted && timeLeft > 0 && timeLeft < DEFAULT_SECONDS)
                      if (hasActiveSession) {
                        setNotice({ type: 'error', text: t('focus.stopBeforeDone') })
                        return
                      }
                      if (!currentTaskId) {
                        setNotice({ type: 'error', text: t('focus.selectTaskFirst') })
                        return
                      }
                      try {
                        await taskAPI.updateTaskStatus(currentTaskId, 'Done')
                        await refresh()
                        setResultText('')
                      } catch {
                        setNotice({ type: 'error', text: 'Failed' })
                      }
                    }}
                  >
                    {t('focus.markDone')}
                  </button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
