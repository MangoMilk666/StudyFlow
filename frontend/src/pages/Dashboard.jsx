import TopNav from '../components/TopNav'
import { useTasks } from '../hooks/useData'
import { useApiHealth } from '../hooks/useApiHealth'

function Panel({ title, color, tasks, onTaskClick }) {
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
          tasks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTaskClick(t.id)}
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
              title="点击切换到下一个状态（演示用）"
            >
              {t.name}
            </button>
          ))
        ) : (
          <div style={{ opacity: 0.6, fontWeight: 'bold' }}>暂无任务</div>
        )}
      </div>
    </section>
  )
}

export default function Dashboard() {
  const { tasks, cycleStatus } = useTasks('demo_user')
  const apiHealth = useApiHealth()

  const byStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    review: tasks.filter((t) => t.status === 'review'),
    done: tasks.filter((t) => t.status === 'done'),
  }

  return (
    <div className="sf-page">
      <div className="main-frame" style={{ maxWidth: 1000 }}>
        <TopNav />

        <main
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: 30,
          }}
        >
          <Panel title="To Do" color="var(--panel-todo)" tasks={byStatus.todo} onTaskClick={cycleStatus} />
          <Panel
            title="In Progress"
            color="var(--panel-progress)"
            tasks={byStatus.in_progress}
            onTaskClick={cycleStatus}
          />
          <Panel title="Review" color="var(--panel-review)" tasks={byStatus.review} onTaskClick={cycleStatus} />
          <Panel title="Done" color="var(--panel-done)" tasks={byStatus.done} onTaskClick={cycleStatus} />
        </main>

        <div style={{ marginTop: 18, fontSize: 12, opacity: 0.8 }}>
          备注：这是“页面骨架 + 演示交互”。后续你可以把 task 列表从本地 mock 切到 `/api/tasks`。
          {apiHealth.status === 'ok' ? ` 后端：已连接（${apiHealth.data?.status || 'unknown'}）` : ' 后端：未连接（可先用 MOCK_MODE=true 启动后端）'}
        </div>
      </div>
    </div>
  )
}
