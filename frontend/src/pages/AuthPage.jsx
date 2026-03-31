import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNav from '../components/TopNav'
import { useAuth } from '../hooks/useData'

export default function AuthPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [mode, setMode] = useState('login')
  const isLogin = mode === 'login'
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')

  const title = useMemo(() => (isLogin ? 'Login' : 'Register'), [isLogin])

  return (
    <div className="sf-page">
      <div className="main-frame">
        <TopNav />

        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h1 style={{ textAlign: 'center', margin: '10px 0 18px 0' }}>{title}</h1>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 18 }}>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setMode('login')
                setError('')
              }}
              style={{ background: isLogin ? 'var(--active-bg)' : 'white' }}
            >
              Login
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setMode('register')
                setError('')
              }}
              style={{ background: !isLogin ? 'var(--active-bg)' : 'white' }}
            >
              Register
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError('')

              if (!form.email || !form.password || (!isLogin && !form.username)) {
                setError('请填写完整信息。')
                return
              }

              login(
                {
                  userId: 'demo_user',
                  username: form.username || 'demo',
                  email: form.email,
                },
                'demo_token'
              )

              navigate('/dashboard')
            }}
            style={{ display: 'grid', gap: 12 }}
          >
            {!isLogin ? (
              <label style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 'bold' }}>Username</div>
                <input
                  value={form.username}
                  onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                  style={{ padding: '10px 12px', borderRadius: 12, border: `2px solid var(--ink)` }}
                />
              </label>
            ) : null}

            <label style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontWeight: 'bold' }}>Email</div>
              <input
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                type="email"
                style={{ padding: '10px 12px', borderRadius: 12, border: `2px solid var(--ink)` }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontWeight: 'bold' }}>Password</div>
              <input
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                type="password"
                style={{ padding: '10px 12px', borderRadius: 12, border: `2px solid var(--ink)` }}
              />
            </label>

            {error ? (
              <div
                style={{
                  border: `2px solid var(--ink)`,
                  borderRadius: 14,
                  padding: '10px 12px',
                  background: 'var(--btn-delete-bg)',
                  fontWeight: 'bold',
                }}
              >
                {error}
              </div>
            ) : null}

            <button className="btn" type="submit" style={{ background: 'var(--btn-add-bg)' }}>
              {title}
            </button>

            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <a href="/" style={{ textDecoration: 'underline' }}>
                回到首页
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

