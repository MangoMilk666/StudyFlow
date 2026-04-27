import { NavLink } from 'react-router-dom'

import SettingsFab from './SettingsFab'
import AIFab from './AIFab'
import { useI18n } from '../i18n'
import { useAuth } from '../auth'

export default function TopNav() {
  const { t } = useI18n()
  const { isAuthenticated } = useAuth()

  const navItems = isAuthenticated
    ? [
        { to: '/stats', labelKey: 'nav.stats' },
        { to: '/dashboard', labelKey: 'nav.dashboard' },
        { to: '/tasks', labelKey: 'nav.tasks' },
        { to: '/focus', labelKey: 'nav.focus' },
      ]
    : [
        { to: '/', labelKey: 'nav.home' },
        { to: '/dashboard', labelKey: 'nav.dashboard' },
        { to: '/tasks', labelKey: 'nav.tasks' },
        { to: '/focus', labelKey: 'nav.focus' },
      ]

  return (
    <>
      <nav className="nav-bar" aria-label="Top navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
      {isAuthenticated ? <AIFab /> : null}
      <SettingsFab />
    </>
  )
}
