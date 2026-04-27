import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'
import robotIcon from '../assets/robot-avatar.svg'
import ChatModal from './ChatModal'

export default function AIFab() {
  const { t } = useI18n()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  if (location.pathname === '/auth') return null

  return (
    <>
      <button
        type="button"
        className="sf-ai-fab"
        aria-label={t('ai.openLabel')}
        onClick={() => setOpen(true)}
      >
        <img src={robotIcon} alt={t('ai.iconAlt')} className="sf-ai-fab-icon" />
      </button>

      <ChatModal
        open={open}
        t={t}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

