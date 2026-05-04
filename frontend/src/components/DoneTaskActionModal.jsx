import { useI18n } from '../i18n'

export default function DoneTaskActionModal({ open, taskName, onArchive, onRestore, onClose, loading }) {
  const { t } = useI18n()

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
        zIndex: 95,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
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
          display: 'grid',
          gap: 12,
        }}
      >
        <div style={{ display: 'grid', gap: 6 }}>
          <h2 style={{ margin: 0, textAlign: 'center' }}>{t('archive.modalTitle')}</h2>
          <div style={{ textAlign: 'center', fontWeight: 'bold', opacity: 0.85 }} title={taskName || ''}>
            {taskName || ''}
          </div>
          <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.8, fontWeight: 'bold' }}>{t('archive.modalHint')}</div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn"
            type="button"
            style={{ background: 'var(--btn-add-bg)' }}
            onClick={onArchive}
            disabled={loading}
          >
            {t('archive.archive')}
          </button>
          <button
            className="btn"
            type="button"
            style={{ background: 'white' }}
            onClick={onRestore}
            disabled={loading}
          >
            {t('archive.restoreToTodo')}
          </button>
          <button
            className="btn"
            type="button"
            style={{ background: 'var(--btn-edit-bg)' }}
            onClick={onClose}
            disabled={loading}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

