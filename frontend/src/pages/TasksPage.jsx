import TopNav from '../components/TopNav'
import { useTasks } from '../hooks/useData'

function priorityClass(p) {
  if (p === 'H') return 'priority-h'
  if (p === 'M') return 'priority-m'
  return 'priority-l'
}

function statusNode(status) {
  if (status === 'done') return <span className="status-done">Done</span>
  return <span className="status-todo">To Do</span>
}

export default function TasksPage() {
  const { tasks, addTask, removeTask, updateTask } = useTasks('demo_user')

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
              onClick={() => {
                addTask({
                  name: 'LeetCode Hard * 3',
                  deadline: '2026-03-20',
                  module: 'it5003',
                  priority: 'M',
                  status: 'todo',
                })
              }}
            >
              Add New Task
            </button>

            <div style={{ fontSize: 14, fontWeight: 'bold' }}>
              Priority: <span className="priority-h">H</span>(igh), <span className="priority-m">M</span>(edium),{' '}
              <span className="priority-l">L</span>(ow)
            </div>
          </div>

          <div style={{ border: `2px solid var(--ink)`, borderRadius: 20, overflow: 'hidden' }}>
            <div className="sf-xscroll">
              <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: `2px solid var(--ink)`, borderRight: '1px solid #ddd', padding: 15, background: '#fafafa' }}>
                      Name
                    </th>
                    <th style={{ borderBottom: `2px solid var(--ink)`, borderRight: '1px solid #ddd', padding: 15, background: '#fafafa' }}>
                      Deadline
                    </th>
                    <th style={{ borderBottom: `2px solid var(--ink)`, borderRight: '1px solid #ddd', padding: 15, background: '#fafafa' }}>
                      Module
                    </th>
                    <th style={{ borderBottom: `2px solid var(--ink)`, borderRight: '1px solid #ddd', padding: 15, background: '#fafafa' }}>
                      
                    </th>
                    <th style={{ borderBottom: `2px solid var(--ink)`, borderRight: '1px solid #ddd', padding: 15, background: '#fafafa' }}>
                      Create Time
                    </th>
                    <th style={{ borderBottom: `2px solid var(--ink)`, borderRight: '1px solid #ddd', padding: 15, background: '#fafafa' }}>
                      Status
                    </th>
                    <th style={{ borderBottom: `2px solid var(--ink)`, padding: 15, background: '#fafafa' }}>Operation</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12 }}>{t.name}</td>
                      <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12 }}>{t.deadline}</td>
                      <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12 }}>{t.module}</td>
                      <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12 }}>
                        <span className={priorityClass(t.priority)}>{t.priority}</span>
                      </td>
                      <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12 }}>{t.createdAt}</td>
                      <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12 }}>{statusNode(t.status)}</td>
                      <td style={{ borderBottom: '1px solid #eee', padding: 12 }}>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => updateTask(t.id, { status: t.status === 'done' ? 'todo' : 'done' })}
                            style={{
                              border: `2px solid var(--ink)`,
                              borderRadius: 8,
                              padding: '5px 20px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              background: 'var(--btn-edit-bg)',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTask(t.id)}
                            style={{
                              border: `2px solid var(--ink)`,
                              borderRadius: 8,
                              padding: '5px 20px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              background: 'var(--btn-delete-bg)',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ color: '#999', padding: 20 }}>
                        No tasks
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
