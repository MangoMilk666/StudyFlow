import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import TopNav from '../components/TopNav'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { statsAPI } from '../services/api'

function Panel({ title, color, children }) {
  return (
    <section
      style={{
        border: `3px solid var(--ink)`,
        borderRadius: 30,
        padding: 20,
        minHeight: 260,
        background: color,
      }}
    >
      <h2 style={{ textAlign: 'center', fontSize: 22, margin: '0 0 14px 0' }}>{title}</h2>
      <div style={{ width: '100%', height: 210 }}>{children}</div>
    </section>
  )
}

function RangeButton({ active, onClick, children }) {
  return (
    <button
      className="btn"
      type="button"
      onClick={onClick}
      style={{ background: active ? 'var(--active-bg)' : 'white' }}
    >
      {children}
    </button>
  )
}

export default function StatsPage() {
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [range, setRange] = useState('week')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) return

    let canceled = false
    setLoading(true)
    setNotice(null)

    statsAPI
      .getSummary(range)
      .then((resp) => {
        if (canceled) return
        setData(resp.data || null)
      })
      .catch((err) => {
        if (canceled) return
        const msg = err?.response?.data?.error || err?.message || 'Load failed'
        setNotice({ type: 'error', text: msg })
      })
      .finally(() => {
        if (canceled) return
        setLoading(false)
      })

    return () => {
      canceled = true
    }
  }, [isAuthenticated, range])

  const completionData = useMemo(() => {
    const done = Number(data?.done || 0)
    const undone = Number(data?.undone || 0)
    return [
      { name: t('stats.done'), value: done },
      { name: t('stats.undone'), value: undone },
    ]
  }, [data, t])

  const completionColors = useMemo(() => ['var(--panel-done)', 'var(--panel-todo)'], [])

  const moduleData = useMemo(() => {
    const arr = Array.isArray(data?.moduleTimeSpent) ? data.moduleTimeSpent : []
    return arr.map((x) => ({ name: x.module || t('stats.uncategorized'), minutes: Number(x.minutes || 0) }))
  }, [data, t])

  const topTaskData = useMemo(() => {
    const arr = Array.isArray(data?.topTasksByTime) ? data.topTasksByTime : []
    return arr.map((x) => ({ name: x.title || '-', minutes: Number(x.minutes || 0) }))
  }, [data])

  const trendData = useMemo(() => {
    const arr = Array.isArray(data?.trend) ? data.trend : []
    return arr.map((x) => ({ date: x.date, done: Number(x.done || 0), created: Number(x.created || 0) }))
  }, [data])

  return (
    <div className="sf-page">
      <div className="main-frame">
        <TopNav />

        <div className="sf-scroll">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h1 style={{ margin: '6px 0 14px 0' }}>{t('stats.title')}</h1>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <RangeButton active={range === 'day'} onClick={() => setRange('day')}>
                {t('stats.rangeDay')}
              </RangeButton>
              <RangeButton active={range === 'week'} onClick={() => setRange('week')}>
                {t('stats.rangeWeek')}
              </RangeButton>
              <RangeButton active={range === 'month'} onClick={() => setRange('month')}>
                {t('stats.rangeMonth')}
              </RangeButton>
            </div>
          </div>

          {!isAuthenticated ? (
            <div
              style={{
                border: `3px solid var(--ink)`,
                borderRadius: 24,
                padding: 18,
                background: 'white',
                fontWeight: 'bold',
              }}
            >
              <div style={{ marginBottom: 10 }}>{t('auth.loginRequired')}</div>
              <button className="btn" type="button" style={{ background: 'var(--btn-add-bg)' }} onClick={() => navigate('/auth')}>
                {t('home.auth')}
              </button>
            </div>
          ) : (
            <>
              {notice ? (
                <div
                  style={{
                    border: `2px solid var(--ink)`,
                    borderRadius: 14,
                    padding: '10px 12px',
                    background: 'var(--btn-delete-bg)',
                    fontWeight: 'bold',
                    marginBottom: 14,
                  }}
                >
                  {notice.text}
                </div>
              ) : null}

              {loading ? (
                <div style={{ opacity: 0.7, fontWeight: 'bold' }}>{t('common.loading')}</div>
              ) : (
                <main
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: '1fr 1fr',
                    gap: 30,
                  }}
                >
                  <Panel title={t('stats.panelCompletion')} color="var(--panel-done)">
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ flex: '1 1 auto', minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={completionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                              {completionData.map((_, idx) => (
                                <Cell key={String(idx)} fill={completionColors[idx % completionColors.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ marginTop: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 12 }}>
                        🍅 x{Number(data?.pomodorosCompleted || 0)} · {Number(data?.focusMinutes || 0)} {t('stats.minutes')}
                      </div>
                    </div>
                  </Panel>

                  <Panel title={t('stats.panelModuleTime')} color="var(--panel-progress)">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={moduleData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="minutes" name={t('stats.minutes')} fill="var(--btn-add-bg)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Panel>

                  <Panel title={t('stats.panelTopTasks')} color="var(--panel-review)">
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px 6px 18px 6px',
                      }}
                    >
                      <ResponsiveContainer width="98%" height="96%">
                        <BarChart data={topTaskData} layout="vertical" margin={{ left: 0, right: 14, top: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="minutes" name={t('stats.minutes')} fill="var(--btn-add-bg)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>

                  <Panel title={t('stats.panelTrend')} color="var(--panel-todo)">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} interval={Math.max(Math.floor(trendData.length / 7), 1)} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="done" name={t('stats.done')} stroke="#2d8a34" strokeWidth={3} dot={false} />
                        <Line
                          type="monotone"
                          dataKey="created"
                          name={t('stats.created')}
                          stroke="#222"
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray="5 4"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Panel>
                </main>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
