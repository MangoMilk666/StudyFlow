import { useEffect, useMemo, useRef, useState } from 'react'
import TopNav from '../components/TopNav'
import { useI18n } from '../i18n'
import { useUnifiedTasks } from '../hooks/useUnifiedTasks'
import { useAuth } from '../auth'
import { statsAPI, taskAPI, timerAPI, userAPI } from '../services/api'

const LS_FOCUS_TIMER_KEY = 'sf_focus_timer_v1'
const DEFAULT_SECONDS = 25 * 60
const DEFAULT_CUSTOM_MINUTES = 25

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FocusPage() {
  const { tasks, refresh, isAuthenticated, loading } = useUnifiedTasks()
  useAuth()
  const { t } = useI18n()

  const bunnyVideoRef = useRef(null)

  const [currentTaskId, setCurrentTaskId] = useState('')

  const [timerMode, setTimerMode] = useState('classic')
  const [customMinutes, setCustomMinutes] = useState(DEFAULT_CUSTOM_MINUTES)
  const [customMinutesDraft, setCustomMinutesDraft] = useState(String(DEFAULT_CUSTOM_MINUTES))

  const [targetSeconds, setTargetSeconds] = useState(DEFAULT_SECONDS)

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

      const savedMode = String(parsed.timerMode || '').trim().toLowerCase()
      const safeMode = !isAuthenticated ? 'classic' : (savedMode === 'custom' ? 'custom' : 'classic')
      const savedCustomMinutes = Number(parsed.customMinutes)
      const safeCustomMinutes =
        Number.isFinite(savedCustomMinutes) && savedCustomMinutes > 0
          ? Math.min(240, Math.max(1, Math.floor(savedCustomMinutes)))
          : DEFAULT_CUSTOM_MINUTES

      setTimerMode(safeMode)
      setCustomMinutes(safeCustomMinutes)
      setCustomMinutesDraft(String(safeCustomMinutes))

      const savedTargetSeconds = Number(parsed.targetSeconds)
      const safeTargetSeconds =
        !isAuthenticated
          ? DEFAULT_SECONDS
          : (
              Number.isFinite(savedTargetSeconds) && savedTargetSeconds > 0
                ? Math.min(240 * 60, Math.max(1 * 60, Math.floor(savedTargetSeconds)))
                : (safeMode === 'custom' ? safeCustomMinutes * 60 : DEFAULT_SECONDS)
            )
      setTargetSeconds(safeTargetSeconds)

      const savedTimeLeft = Number(parsed.timeLeft)
      const savedRunning = !!parsed.isRunning
      const savedHasStarted = !!parsed.hasStarted
      const savedUpdatedAt = Number(parsed.updatedAtMs)

      const safeTimeLeft =
        !isAuthenticated
          ? DEFAULT_SECONDS
          : (Number.isFinite(savedTimeLeft) ? Math.max(0, Math.floor(savedTimeLeft)) : safeTargetSeconds)
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
  }, [isAuthenticated])

  const hasActiveSession = useMemo(() => {
    if (isRunning) return true
    return !!(hasStarted && timeLeft > 0 && timeLeft < targetSeconds)
  }, [hasStarted, isRunning, targetSeconds, timeLeft])

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) return

    userAPI
      .getProfile()
      .then((resp) => {
        const p = resp?.data || {}
        const modeRaw = String(p.focusTimerMode || '').trim().toLowerCase()
        const nextMode = modeRaw === 'custom' ? 'custom' : 'classic'
        const cm = Number(p.focusCustomMinutes)
        const nextCustom = Number.isFinite(cm) && cm > 0 ? Math.min(240, Math.max(1, Math.floor(cm))) : DEFAULT_CUSTOM_MINUTES

        setTimerMode(nextMode)
        setCustomMinutes(nextCustom)
        setCustomMinutesDraft(String(nextCustom))

        if (hasActiveSession) return
        const nextTarget = nextMode === 'custom' ? nextCustom * 60 : DEFAULT_SECONDS
        setTargetSeconds(nextTarget)
        setTimeLeft(nextTarget)
        runBaseLeftRef.current = nextTarget
        runStartMsRef.current = null
        stopOnceRef.current = false
        setHasStarted(false)
        setIsRunning(false)
      })
      .catch(() => {})
  }, [hasActiveSession, hydrated, isAuthenticated])

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
    setTimeLeft(targetSeconds)
    stopOnceRef.current = false
    runStartMsRef.current = null
    runBaseLeftRef.current = targetSeconds
  }, [currentTaskId, hydrated, loading, selectableTasks, targetSeconds])

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
    const el = bunnyVideoRef.current
    if (!el) return

    if (isRunning) {
      const p = el.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {})
      }
      return
    }

    try {
      el.pause()
    } catch {
      // ignore
    }
  }, [isRunning])

  useEffect(() => {
    if (!hydrated) return
    if (isAuthenticated) return

    if (hasActiveSession) return
    setTimerMode('classic')
    setCustomMinutes(DEFAULT_CUSTOM_MINUTES)
    setCustomMinutesDraft(String(DEFAULT_CUSTOM_MINUTES))
    setTargetSeconds(DEFAULT_SECONDS)
    setTimeLeft(DEFAULT_SECONDS)
    setHasStarted(false)
    setIsRunning(false)
    stopOnceRef.current = false
    runStartMsRef.current = null
    runBaseLeftRef.current = DEFAULT_SECONDS
  }, [hasActiveSession, hydrated, isAuthenticated])

  useEffect(() => {
    if (!hydrated) return
    try {
      const forcedGuestMode = !isAuthenticated
      localStorage.setItem(
        LS_FOCUS_TIMER_KEY,
        JSON.stringify({
          currentTaskId,
          timeLeft: forcedGuestMode ? Math.min(DEFAULT_SECONDS, Math.max(0, timeLeft)) : timeLeft,
          isRunning,
          hasStarted,
          targetSeconds: forcedGuestMode ? DEFAULT_SECONDS : targetSeconds,
          timerMode: forcedGuestMode ? 'classic' : timerMode,
          customMinutes: forcedGuestMode ? DEFAULT_CUSTOM_MINUTES : customMinutes,
          updatedAtMs: Date.now(),
        })
      )
    } catch {
      // ignore
    }
  }, [currentTaskId, hydrated, isAuthenticated, timeLeft, isRunning, hasStarted, targetSeconds, timerMode, customMinutes])

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
      .stopTimer(taskId, targetSeconds, 'completed', targetSeconds)
      .then(() => statsAPI.getTaskStats(taskId))
      .then((resp) => {
        const minutes = Number(resp?.data?.totalMinutes || 0)
        setResultText(`${t('focus.congrats')} ${t('focus.totalFocused', minutes)}`)
      })
      .catch(() => {})
  }, [currentTaskId, isAuthenticated, isRunning, timeLeft, t, targetSeconds])

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

    const spent = Math.max(0, targetSeconds - Math.max(0, effectiveLeft))
    if (spent > 0) {
      try {
        await timerAPI.stopTimer(currentTaskId, spent, 'interrupted', targetSeconds)
        const resp = await statsAPI.getTaskStats(currentTaskId)
        const minutes = Number(resp?.data?.totalMinutes || 0)
        setResultText(t('focus.totalFocused', minutes))
      } catch {
        // ignore
      }
    }

    setHasStarted(false)
    setTimeLeft(targetSeconds)
    stopOnceRef.current = false
  }

  const applyCustomMinutes = async () => {
    setNotice(null)
    if (!isAuthenticated) {
      setNotice({ type: 'error', text: t('auth.loginRequired') })
      return
    }
    if (hasActiveSession) {
      setNotice({ type: 'error', text: t('focus.stopBeforeAdjust') })
      return
    }
    const next = Number(customMinutesDraft)
    if (!Number.isFinite(next) || next <= 0) {
      setNotice({ type: 'error', text: t('focus.invalidMinutes') })
      return
    }
    const minutes = Math.min(240, Math.max(1, Math.floor(next)))
    setCustomMinutes(minutes)
    setCustomMinutesDraft(String(minutes))
    setTimerMode('custom')

    const nextTarget = minutes * 60
    setTargetSeconds(nextTarget)
    setTimeLeft(nextTarget)
    setHasStarted(false)
    setIsRunning(false)
    runStartMsRef.current = null
    runBaseLeftRef.current = nextTarget
    stopOnceRef.current = false

    if (!isAuthenticated) return
    try {
      await userAPI.updateFocusTimer({ mode: 'custom', customMinutes: minutes })
    } catch {
      // ignore
    }
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
                    if (timeLeft <= 0) setTimeLeft(targetSeconds)
                    runBaseLeftRef.current = timeLeft <= 0 ? targetSeconds : timeLeft
                    runStartMsRef.current = Date.now()
                    setIsRunning(true)
                  }}
                  style={{ background: '#ffcf9f' }}
                >
                  {primaryLabel}
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85, textAlign: 'center', fontWeight: 'bold' }}>
                {timerMode === 'custom' ? t('focus.modeCustom', Math.floor(targetSeconds / 60)) : t('focus.modeClassic')}
              </div>

              {timerMode === 'custom' && isAuthenticated ? (
                <div style={{ marginTop: 10, display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 'bold' }}>{t('focus.customMinutes')}</div>
                  <input
                    type="number"
                    min={1}
                    max={240}
                    step={1}
                    value={customMinutesDraft}
                    onChange={(e) => setCustomMinutesDraft(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 10, border: `2px solid var(--ink)`, fontWeight: 'bold', width: 120 }}
                    disabled={!hydrated || hasActiveSession}
                  />
                  <button
                    className="btn"
                    type="button"
                    style={{ background: 'white', padding: '8px 14px' }}
                    onClick={applyCustomMinutes}
                    disabled={!hydrated || hasActiveSession}
                  >
                    {t('focus.apply')}
                  </button>
                </div>
              ) : null}

              <div style={{ marginTop: 26, fontSize: 12, opacity: 0.8, textAlign: 'center' }}>
                {!isAuthenticated ? t('common.loginMore') : ''}
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
                      if (hasActiveSession) {
                        setNotice({ type: 'error', text: t('focus.stopBeforeDone') })
                        return
                      }
                      const next = e.target.value
                      setCurrentTaskId(next)
                      setIsRunning(false)
                      setTimeLeft(targetSeconds)
                      setHasStarted(false)
                      stopOnceRef.current = false
                      runStartMsRef.current = null
                      runBaseLeftRef.current = targetSeconds
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

              <div
                style={{
                  border: `3px solid var(--ink)`,
                  borderRadius: 24,
                  padding: 12,
                  background: 'white',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: 180,
                    borderRadius: 18,
                    border: `2px solid var(--ink)`,
                    overflow: 'hidden',
                    background: '#fff',
                  }}
                  aria-hidden="true"
                >
                  <video
                    ref={bunnyVideoRef}
                    src="/assets/bunny-book.mp4"
                    muted
                    playsInline
                    loop
                    preload="metadata"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
