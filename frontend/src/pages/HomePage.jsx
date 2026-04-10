import { useNavigate } from 'react-router-dom'
import AppleIcon from '../components/AppleIcon'
import TopNav from '../components/TopNav'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'

export default function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()

  return (
    <div className="sf-page">
      <div className="main-frame">
        <TopNav />

        <div className="sf-scroll">
          <main
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              paddingBottom: 40,
            }}
          >
            <h1 style={{ fontSize: 48, margin: '0 0 18px 0', letterSpacing: 1 }}>
              {t('home.welcome')}
            </h1>
            <AppleIcon />

            <div style={{ marginTop: 26, display: 'flex', gap: 14, justifyContent: 'center' }}>
              <button
                className="btn"
                type="button"
                onClick={() => navigate('/dashboard')}
                style={{ background: 'var(--btn-add-bg)' }}
              >
                {t('home.enterBoard')}
              </button>
              {!isAuthenticated ? (
                <button
                  className="btn"
                  type="button"
                  onClick={() => navigate('/auth')}
                  style={{ background: 'white' }}
                >
                  {t('home.auth')}
                </button>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
