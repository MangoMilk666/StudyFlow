import { useEffect, useMemo, useState } from 'react'
import TopNav from '../components/TopNav'
import { useTasks } from '../hooks/useData'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FocusPage() {
  const { tasks } = useTasks('demo_user')

  const [currentTaskId, setCurrentTaskId] = useState(tasks[0]?.id || '')
  const [nextTaskId, setNextTaskId] = useState(tasks[1]?.id || '')

  const currentTask = useMemo(() => tasks.find((t) => t.id === currentTaskId), [tasks, currentTaskId])
  const nextTask = useMemo(() => tasks.find((t) => t.id === nextTaskId), [tasks, nextTaskId])

  const [timeLeft, setTimeLeft] = useState(25 * 60 - 1)
  const [isRunning, setIsRunning] = useState(true)

  useEffect(() => {
    if (!isRunning) return

    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 0) return 0
        return t - 1
      })
    }, 1000)

    return () => window.clearInterval(id)
  }, [isRunning])

  useEffect(() => {
    if (timeLeft !== 0) return
    setIsRunning(false)
    window.alert('Time is up!')
  }, [timeLeft])

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
                    setIsRunning(false)
                    setTimeLeft(25 * 60)
                  }}
                  style={{ background: '#f0f0f0' }}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => setIsRunning((v) => !v)}
                  style={{ background: '#ffcf9f' }}
                >
                  {isRunning ? 'Pause' : 'Resume'}
                </button>
              </div>

              <div style={{ marginTop: 26, fontSize: 12, opacity: 0.8, textAlign: 'center' }}>
                页面骨架阶段：计时结束会弹窗提示；后续可对接 `/api/timer/*` 写入记录。
              </div>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
              <div
                style={{
                  border: `3px solid var(--ink)`,
                  borderRadius: 30,
                  padding: 30,
                  textAlign: 'center',
                  background: 'var(--panel-progress)',
                }}
              >
                <h3 style={{ margin: 0, fontSize: 28, marginBottom: 16 }}>Current Task</h3>
                <p style={{ fontSize: 24, margin: 0, fontWeight: 'bold' }}>
                  {currentTask?.name || '未选择'}
                </p>
                <div style={{ marginTop: 14 }}>
                  <select
                    value={currentTaskId}
                    onChange={(e) => setCurrentTaskId(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: `2px solid var(--ink)`,
                      width: '100%',
                      maxWidth: 360,
                      fontWeight: 'bold',
                    }}
                  >
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  border: `3px solid var(--ink)`,
                  borderRadius: 30,
                  padding: 30,
                  textAlign: 'center',
                  background: '#d1c4f9',
                }}
              >
                <h3 style={{ margin: 0, fontSize: 28, marginBottom: 16 }}>Next Task</h3>
                <p style={{ fontSize: 24, margin: 0, fontWeight: 'bold' }}>{nextTask?.name || '未选择'}</p>
                <div style={{ marginTop: 14 }}>
                  <select
                    value={nextTaskId}
                    onChange={(e) => setNextTaskId(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: `2px solid var(--ink)`,
                      width: '100%',
                      maxWidth: 360,
                      fontWeight: 'bold',
                    }}
                  >
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
