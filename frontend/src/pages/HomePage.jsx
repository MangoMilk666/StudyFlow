import { useNavigate } from 'react-router-dom'
import AppleIcon from '../components/AppleIcon'
import TopNav from '../components/TopNav'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="sf-page">
      <div className="main-frame" style={{ maxWidth: 1000, minHeight: 560 }}>
        <TopNav />

        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: 40,
          }}
        >
          <h1 style={{ fontSize: 48, margin: '0 0 18px 0', letterSpacing: 1 }}>
            Welcome To StudyFlow!
          </h1>
          <AppleIcon />

          <div style={{ marginTop: 26, display: 'flex', gap: 14, justifyContent: 'center' }}>
            <button
              className="btn"
              type="button"
              onClick={() => navigate('/dashboard')}
              style={{ background: 'var(--btn-add-bg)' }}
            >
              进入看板
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => navigate('/auth')}
              style={{ background: 'white' }}
            >
              登录 / 注册
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
