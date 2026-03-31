import TopNav from '../components/TopNav'

function Section({ title, color, left, right }) {
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
          onClick={() => window.alert('Coming soon')}
        >
          {left}
        </button>
        <button
          type="button"
          className="btn-pill"
          style={{ background: color, minWidth: 180, flex: 1 }}
          onClick={() => window.alert('Coming soon')}
        >
          {right}
        </button>
      </div>
    </section>
  )
}

export default function SettingsPage() {
  return (
    <div className="sf-page">
      <div className="main-frame" style={{ maxWidth: 1000, padding: 40 }}>
        <TopNav />

        <main style={{ border: `3px solid var(--ink)`, borderRadius: 30, padding: '10px 30px 30px 30px' }}>
          <Section title="Account" color="var(--active-bg)" left="Change Email" right="Option Bar1" />
          <Section title="Security" color="var(--btn-edit-bg)" left="Device Management" right="Option Bar1" />
          <Section title="Privacy" color="var(--panel-done)" left="Data Sharing" right="Option Bar1" />
          <Section title="Preferences" color="var(--btn-delete-bg)" left="Languages" right="Option Bar1" />
        </main>
      </div>
    </div>
  )
}

