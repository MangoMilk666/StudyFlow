import TopNav from '../components/TopNav'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { authAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'

function Section({ title, color, left, right, onLeftClick, onRightClick }) {
  return (
    <section style={{ marginTop: 20 }}>
      <h2 style={{ fontSize: 22, fontWeight: 'bold', margin: '0 0 6px 0', paddingLeft: 10 }}>{title}</h2>
      <div style={{ borderTop: `2px solid var(--ink)`, marginBottom: 20 }} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 10px',
          gap: 16,
        }}
      >
        <button
          type="button"
          className="btn-pill"
          style={{ background: color, minWidth: 180, flex: 1 }}
          onClick={onLeftClick}
        >
          {left}
        </button>
        <button
          type="button"
          className="btn-pill"
          style={{ background: color, minWidth: 180, flex: 1 }}
          onClick={onRightClick}
        >
          {right}
        </button>
      </div>
    </section>
  )
}

export default function SettingsPage() {
  const { toggleLanguage, t } = useI18n()
  const { isAuthenticated, updateUser, user, logout } = useAuth()
  const navigate = useNavigate()

  const changeEmail = async () => {
    if (!isAuthenticated) {
      window.alert(t('auth.loginRequired'))
      return
    }

    const next = window.prompt(t('settings.enterNewEmail'), user?.email || '')
    if (!next) return

    try {
      const resp = await authAPI.updateEmail(next)
      const updated = resp.data?.user
      if (updated?.email) updateUser({ email: updated.email })
      window.alert(t('settings.emailUpdated'))
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Update failed'
      window.alert(msg)
    }
  }

  return (
    <div className="sf-page">
      <div className="main-frame">
        <TopNav />

        <div className="sf-scroll">
          <main style={{ border: `3px solid var(--ink)`, borderRadius: 30, padding: '10px 30px 30px 30px' }}>
            <Section
              title={t('settings.account')}
              color="var(--active-bg)"
              left={t('settings.changeEmail')}
              right={`${t('settings.option')} 1`}
              onLeftClick={changeEmail}
              onRightClick={() => window.alert(t('settings.comingSoon'))}
            />
            <Section
              title={t('settings.security')}
              color="var(--btn-edit-bg)"
              left={t('settings.deviceManagement')}
              right={`${t('settings.option')} 1`}
              onLeftClick={() => window.alert(t('settings.comingSoon'))}
              onRightClick={() => window.alert(t('settings.comingSoon'))}
            />
            <Section
              title={t('settings.privacy')}
              color="var(--panel-done)"
              left={t('settings.dataSharing')}
              right={`${t('settings.option')} 1`}
              onLeftClick={() => window.alert(t('settings.comingSoon'))}
              onRightClick={() => window.alert(t('settings.comingSoon'))}
            />
            <Section
              title={t('settings.preferences')}
              color="var(--btn-delete-bg)"
              left={t('settings.languages')}
              right={`${t('settings.option')} 1`}
              onLeftClick={() => toggleLanguage()}
              onRightClick={() => window.alert(t('settings.comingSoon'))}
            />

            {isAuthenticated ? (
              <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ background: 'var(--btn-delete-bg)' }}
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                >
                  {t('settings.logout')}
                </button>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  )
}
