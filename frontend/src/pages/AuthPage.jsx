import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNav from '../components/TopNav'
import { useAuth } from '../auth'
import { authAPI } from '../services/api'
import { useI18n } from '../i18n'

export default function AuthPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { t } = useI18n()

  const [mode, setMode] = useState('login')
  const isLogin = mode === 'login'
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [notice, setNotice] = useState(null)

  const i18nTitle = useMemo(() => (isLogin ? t('auth.login') : t('auth.register')), [isLogin, t])

  return (
    <div className="sf-page">
      <div className="main-frame">
        <TopNav />

        <div className="sf-scroll">
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <h1 style={{ textAlign: 'center', margin: '10px 0 18px 0' }}>{i18nTitle}</h1>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 18 }}>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setMode('login')
                  setNotice(null)
                }}
                style={{ background: isLogin ? 'var(--active-bg)' : 'white' }}
              >
                {t('auth.login')}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setMode('register')
                  setNotice(null)
                }}
                style={{ background: !isLogin ? 'var(--active-bg)' : 'white' }}
              >
                {t('auth.register')}
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setNotice(null)

                if (!form.email || !form.password || (!isLogin && !form.username)) {
                  setNotice({ type: 'error', text: t('auth.fillAll') })
                  return
                }

                try {
                  const resp = isLogin
                    ? await authAPI.login(form.email, form.password)
                    : await authAPI.register(form.username, form.email, form.password)

                  const { token, user } = resp.data || {}
                  if (!token || !user) {
                    setNotice({ type: 'error', text: 'Unexpected response' })
                    return
                  }

                  login(
                    {
                      userId: user.userId,
                      username: user.username,
                      email: user.email,
                    },
                    token
                  )

                  setNotice({ type: 'success', text: isLogin ? t('auth.loginSuccess') : t('auth.registerSuccess') })
                  window.setTimeout(() => navigate('/dashboard'), 450)
                } catch (err) {
                  const msg = err?.response?.data?.error || err?.message || 'Login failed'
                  setNotice({ type: 'error', text: msg })
                }
              }}
              style={{ display: 'grid', gap: 12 }}
            >
              {!isLogin ? (
                <label style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontWeight: 'bold' }}>{t('auth.username')}</div>
                  <input
                    value={form.username}
                    onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                    style={{ padding: '10px 12px', borderRadius: 12, border: `2px solid var(--ink)` }}
                  />
                </label>
              ) : null}

              <label style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 'bold' }}>{t('auth.email')}</div>
                <input
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  type="email"
                  style={{ padding: '10px 12px', borderRadius: 12, border: `2px solid var(--ink)` }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 'bold' }}>{t('auth.password')}</div>
                <input
                  value={form.password}
                  onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                  type="password"
                  style={{ padding: '10px 12px', borderRadius: 12, border: `2px solid var(--ink)` }}
                />
              </label>

              {notice ? (
                <div
                  style={{
                    border: `2px solid var(--ink)`,
                    borderRadius: 14,
                    padding: '10px 12px',
                    background: notice.type === 'success' ? 'var(--panel-done)' : 'var(--btn-delete-bg)',
                    fontWeight: 'bold',
                  }}
                >
                  {notice.text}
                </div>
              ) : null}

              <button className="btn" type="submit" style={{ background: 'var(--btn-add-bg)' }}>
                {i18nTitle}
              </button>

              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <a href="/" style={{ textDecoration: 'underline' }}>
                  {t('auth.backHome')}
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
