import { useEffect, useMemo, useState } from 'react'

function toDateInputValue(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const caretSvgUrl = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>'
)}`

const baseFieldStyle = {
  padding: '10px 12px',
  borderRadius: 12,
  border: `3px solid var(--ink)`,
  background: 'white',
  color: 'var(--ink)',
  fontWeight: 'bold',
  minHeight: 44,
  boxShadow: '4px 4px 0 var(--ink)',
  outline: 'none',
}

const dropdownFieldStyle = {
  ...baseFieldStyle,
  paddingRight: 42,
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  backgroundImage: `url("${caretSvgUrl}")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  backgroundSize: 16,
}

export default function TaskModal({ open, initial, onCancel, onSubmit, t, moduleOptions = [] }) {
  const [form, setForm] = useState({ title: '', deadline: '', moduleName: '', priority: 'M' })

  const isEdit = useMemo(() => !!initial?.id, [initial])

  useEffect(() => {
    if (!open) return
    setForm({
      title: initial?.title || '',
      deadline: toDateInputValue(initial?.deadline) || '',
      moduleName: initial?.moduleName || '',
      priority: initial?.priority || 'M',
    })
  }, [open, initial])

  if (!open) return null

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
        zIndex: 80,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        style={{
          width: 'min(560px, 100%)',
          background: 'white',
          border: `3px solid var(--ink)`,
          borderRadius: 24,
          padding: 18,
          boxShadow: '10px 10px 0 rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h2 style={{ margin: 0 }}>{isEdit ? t('tasks.editTitle') : t('tasks.newTitle')}</h2>
          <button
            type="button"
            className="btn"
            style={{ padding: '6px 14px', fontSize: 14, background: '#f0f0f0' }}
            onClick={onCancel}
          >
            {t('common.cancel')}
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(form)
          }}
          style={{ marginTop: 14, display: 'grid', gap: 12 }}
        >
          <label style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontWeight: 'bold' }}>{t('tasks.title')}</div>
            <input
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              style={baseFieldStyle}
              placeholder={t('tasks.titlePlaceholder')}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontWeight: 'bold' }}>{t('tasks.deadline')}</div>
            <input
              value={form.deadline}
              onChange={(e) => setForm((s) => ({ ...s, deadline: e.target.value }))}
              type="date"
              style={baseFieldStyle}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontWeight: 'bold' }}>{t('tasks.module')}</div>
            <input
              value={form.moduleName}
              onChange={(e) => setForm((s) => ({ ...s, moduleName: e.target.value }))}
              list="task-module-options"
              style={dropdownFieldStyle}
              placeholder={t('tasks.modulePlaceholder')}
            />
            <datalist id="task-module-options">
              {(moduleOptions || []).map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontWeight: 'bold' }}>{t('tasks.priority')}</div>
            <select
              value={form.priority}
              onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))}
              style={dropdownFieldStyle}
            >
              <option value="H">{t('tasks.priorityHigh')}</option>
              <option value="M">{t('tasks.priorityMedium')}</option>
              <option value="L">{t('tasks.priorityLow')}</option>
            </select>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button
              className="btn"
              type="submit"
              style={{ background: 'var(--btn-add-bg)', padding: '10px 18px', fontSize: 16 }}
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
