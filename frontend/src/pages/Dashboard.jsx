import TopNav from '../components/TopNav'
import { useApiHealth } from '../hooks/useApiHealth'
import { useI18n } from '../i18n'
import { useUnifiedTasks } from '../hooks/useUnifiedTasks'

function Panel({ title, color, tasks, onTaskClick }) {
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
              }}
              title={tr('dashboard.clickHint')}
            >
              {task.name}
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
  const { tasks, cycleStatus } = useUnifiedTasks()
  const apiHealth = useApiHealth()
  const { t: tr } = useI18n()

  const byStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    review: tasks.filter((t) => t.status === 'review'),
    done: tasks.filter((t) => t.status === 'done'),
  }

  return (
    <div className="sf-page">
      <div className="main-frame">
        <TopNav />

        <div className="sf-scroll">
          <main
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 30,
            }}
          >
            <Panel title={tr('dashboard.todo')} color="var(--panel-todo)" tasks={byStatus.todo} onTaskClick={cycleStatus} />
            <Panel
              title={tr('dashboard.inProgress')}
              color="var(--panel-progress)"
              tasks={byStatus.in_progress}
              onTaskClick={cycleStatus}
            />
            <Panel title={tr('dashboard.review')} color="var(--panel-review)" tasks={byStatus.review} onTaskClick={cycleStatus} />
            <Panel title={tr('dashboard.done')} color="var(--panel-done)" tasks={byStatus.done} onTaskClick={cycleStatus} />
          </main>

          <div style={{ marginTop: 18, fontSize: 12, opacity: 0.8 }}>
            {tr('dashboard.note')}
            {apiHealth.status === 'ok'
              ? ` ${tr('dashboard.backendOk', apiHealth.data?.status)}`
              : ` ${tr('dashboard.backendErr')}`}
          </div>
        </div>
      </div>
    </div>
  )
}
