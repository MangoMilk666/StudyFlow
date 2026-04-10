import { NavLink } from 'react-router-dom'

import SettingsFab from './SettingsFab'
import { useI18n } from '../i18n'

const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/dashboard', labelKey: 'nav.dashboard' },
  { to: '/tasks', labelKey: 'nav.tasks' },
  { to: '/focus', labelKey: 'nav.focus' },
]

export default function TopNav() {
  const { t } = useI18n()

  return (
    <>
      <nav className="nav-bar" aria-label="Top navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
      <SettingsFab />
    </>
  )
}
