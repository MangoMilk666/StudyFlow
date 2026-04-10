import { useEffect, useMemo, useState } from 'react'

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function CanvasImportModal({ open, t, courses, loadingCourses, onClose, onPreview, previewing, assignments, onConfirm, confirming }) {
  const [selected, setSelected] = useState([])

  useEffect(() => {
    if (!open) return
    setSelected([])
  }, [open])

  const allSelected = useMemo(() => courses.length > 0 && selected.length === courses.length, [courses.length, selected.length])

  const toggleCourse = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleAll = () => {
    setSelected(allSelected ? [] : courses.map((c) => String(c.id)))
  }

  if (!open) return null

  const showAssignments = assignments && assignments.length

  return (
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
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: 'min(980px, 100%)',
          maxHeight: 'min(78vh, 820px)',
          overflow: 'hidden',
          background: 'white',
          border: `3px solid var(--ink)`,
          borderRadius: 24,
          padding: 18,
          boxShadow: '10px 10px 0 rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h2 style={{ margin: 0 }}>{t('canvas.modalTitle')}</h2>
          <button
            type="button"
            className="btn"
            style={{ padding: '6px 14px', fontSize: 14, background: '#f0f0f0' }}
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.85 }}>{t('canvas.modalHint')}</div>

        <div style={{ flex: '1 1 auto', overflow: 'auto' }}>
          <div style={{ border: `2px solid var(--ink)`, borderRadius: 20, overflow: 'hidden' }}>
            <div className="sf-xscroll">
              <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: `2px solid var(--ink)`, borderRight: '1px solid #ddd', padding: 15, background: '#fafafa' }}>
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                    </th>
                    <th style={{ borderBottom: `2px solid var(--ink)`, borderRight: '1px solid #ddd', padding: 15, background: '#fafafa' }}>
                      {t('canvas.courseName')}
                    </th>
                    <th style={{ borderBottom: `2px solid var(--ink)`, padding: 15, background: '#fafafa' }}>{t('canvas.courseId')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCourses ? (
                    <tr>
                      <td colSpan={3} style={{ color: '#999', padding: 20 }}>
                        {t('common.loading')}
                      </td>
                    </tr>
                  ) : null}

                  {!loadingCourses && courses.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ color: '#999', padding: 20 }}>
                        {t('canvas.noCourses')}
                      </td>
                    </tr>
                  ) : null}

                  {!loadingCourses
                    ? courses.map((c) => (
                      <tr key={c.id}>
                        <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12 }}>
                          <input
                            type="checkbox"
                            checked={selected.includes(String(c.id))}
                            onChange={() => toggleCourse(String(c.id))}
                          />
                        </td>
                        <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12, textAlign: 'left' }}>{c.name}</td>
                        <td style={{ borderBottom: '1px solid #eee', padding: 12 }}>{c.id}</td>
                      </tr>
                    ))
                    : null}
                </tbody>
              </table>
            </div>
          </div>

          {showAssignments ? (
            <div style={{ marginTop: 14, border: `2px solid var(--ink)`, borderRadius: 20, overflow: 'hidden' }}>
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
                      <th style={{ borderBottom: `2px solid var(--ink)`, padding: 15, background: '#fafafa' }}>{t('tasks.module')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => (
                      <tr key={`${a.courseId}:${a.assignmentId}`}>
                        <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12, textAlign: 'left' }}>{a.name}</td>
                        <td style={{ borderBottom: '1px solid #eee', borderRight: '1px solid #ddd', padding: 12 }}>{formatDate(a.due_at)}</td>
                        <td style={{ borderBottom: '1px solid #eee', padding: 12 }}>{a.courseName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            className="btn"
            style={{ background: 'var(--btn-edit-bg)', padding: '10px 18px', fontSize: 16 }}
            disabled={previewing || confirming || selected.length === 0}
            onClick={() => onPreview(selected)}
          >
            {t('canvas.previewAssignments')}
          </button>
          <button
            type="button"
            className="btn"
            style={{ background: 'var(--btn-add-bg)', padding: '10px 18px', fontSize: 16 }}
            disabled={confirming || selected.length === 0}
            onClick={() => onConfirm(selected)}
          >
            {t('canvas.confirmImport')}
          </button>
        </div>
      </div>
    </div>
  )
}

