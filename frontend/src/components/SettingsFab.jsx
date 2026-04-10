import { useLocation, useNavigate } from 'react-router-dom'

import settingsIcon from '../assets/solar--settings-bold.svg'

export default function SettingsFab() {
  const navigate = useNavigate()
  const location = useLocation()

  if (location.pathname === '/settings') return null

  return (
    <button
      type="button"
      className="sf-settings-fab"
      aria-label="Open settings"
      onClick={() => navigate('/settings')}
    >
      <img src={settingsIcon} alt="Settings" className="sf-settings-fab-icon" />
    </button>
  )
}
