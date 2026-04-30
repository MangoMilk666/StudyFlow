import TopNav from '../components/TopNav'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import { authAPI, moduleAPI, userAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'

function Card({ title, color, children }) {
  return (
    <section style={{ border: `3px solid var(--ink)`, borderRadius: 26, padding: 18, background: color }}>
      <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: '0 0 12px 0' }}>{title}</h2>
      {children}
    </section>
  )
}

function formatDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function normalizeColorHex(value) {
  const raw = String(value ?? '').trim().replace(/\s+/g, '')
  const s = raw.startsWith('#') ? raw.slice(1) : raw
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s.toLowerCase()}`
  return '#3f51b5'
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(760px, 100%)',
          maxHeight: 'min(78vh, 720px)',
          overflow: 'auto',
          background: 'white',
          border: `3px solid var(--ink)`,
          borderRadius: 20,
          padding: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 'bold', fontSize: 18 }}>{title}</div>
          <button type="button" className="btn" style={{ background: 'var(--btn-delete-bg)' }} onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { toggleLanguage, t } = useI18n()
  const { isAuthenticated, updateUser, user, logout } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState(null)
  const [profile, setProfile] = useState(null)
  const [modules, setModules] = useState([])
  const [aiConfig, setAiConfig] = useState(null)
  const [devices, setDevices] = useState([])

  const [policyOpen, setPolicyOpen] = useState(false)

  const [moduleDraft, setModuleDraft] = useState({ name: '', colorCode: '#3f51b5' })
  const [editingModuleId, setEditingModuleId] = useState(null)

  const [aiDraft, setAiDraft] = useState({ usePersonalKey: false, model: '', apiKey: '' })

  const [consentDraft, setConsentDraft] = useState(false)

  const initials = useMemo(() => {
    const name = String(profile?.username || user?.username || '').trim()
    const first = name ? name[0] : 'U'
    return first.toUpperCase()
  }, [profile?.username, user?.username])

  const loadAll = async () => {
    if (!isAuthenticated) return
    setLoading(true)
    setNotice(null)
    try {
      const [p, m, a, d] = await Promise.all([
        userAPI.getProfile(),
        moduleAPI.getAllModules(),
        userAPI.getAIConfig(),
        userAPI.listDevices(),
      ])
      setProfile(p.data || null)
      setModules(Array.isArray(m.data) ? m.data : [])
      setAiConfig(a.data || null)
      const list = Array.isArray(d.data) ? d.data : []
      setDevices(list.filter((x) => !x?.revokedAt))
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Load failed'
      setNotice({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [isAuthenticated])

  useEffect(() => {
    const usePersonalKey = !!aiConfig?.usePersonalKey
    const model = String(aiConfig?.model || '').trim()
    setAiDraft((s) => ({ ...s, usePersonalKey, model, apiKey: '' }))
  }, [aiConfig?.model, aiConfig?.usePersonalKey])

  useEffect(() => {
    setConsentDraft(!!profile?.dataSharingAccepted)
  }, [profile?.dataSharingAccepted])

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

  const changeUsername = async () => {
    if (!isAuthenticated) {
      window.alert(t('auth.loginRequired'))
      return
    }

    const current = profile?.username || user?.username || ''
    const next = window.prompt(t('settings.enterNewUsername'), current)
    if (!next || next.trim() === current) return

    try {
      const resp = await userAPI.updateUsername(next.trim())
      const updated = resp.data
      if (updated?.username) {
        setProfile(updated)
        updateUser({ username: updated.username })
      }
      window.alert(t('settings.usernameUpdated'))
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Update failed'
      window.alert(msg)
    }
  }

  const saveModule = async () => {
    setNotice(null)
    const name = String(moduleDraft.name || '').trim()
    const colorCode = normalizeColorHex(moduleDraft.colorCode)
    if (!name) {
      setNotice({ type: 'error', text: t('settings.moduleNameRequired') })
      return
    }
    try {
      setLoading(true)
      if (editingModuleId) {
        await moduleAPI.updateModule(editingModuleId, { name, colorCode })
      } else {
        await moduleAPI.createModule({ name, colorCode })
      }
      setModuleDraft({ name: '', colorCode: '#3f51b5' })
      setEditingModuleId(null)
      const resp = await moduleAPI.getAllModules()
      setModules(Array.isArray(resp.data) ? resp.data : [])
      setNotice({ type: 'success', text: t('settings.saved') })
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Save failed'
      setNotice({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  const startEditModule = (m) => {
    setEditingModuleId(m?._id || null)
    setModuleDraft({ name: m?.name || '', colorCode: m?.colorCode || '#3f51b5' })
    setNotice(null)
  }

  const deleteModule = async (id) => {
    setNotice(null)
    const ok = window.confirm(t('settings.confirmDelete'))
    if (!ok) return
    try {
      setLoading(true)
      await moduleAPI.deleteModule(id)
      const resp = await moduleAPI.getAllModules()
      setModules(Array.isArray(resp.data) ? resp.data : [])
      setNotice({ type: 'success', text: t('settings.deleted') })
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Delete failed'
      setNotice({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  const saveAIConfig = async () => {
    setNotice(null)
    try {
      setLoading(true)
      const payload = {
        usePersonalKey: !!aiDraft.usePersonalKey,
        model: String(aiDraft.model || '').trim() || null,
      }
      if (aiDraft.apiKey !== '') {
        payload.apiKey = aiDraft.apiKey
      }
      const resp = await userAPI.updateAIConfig(payload)
      setAiConfig(resp.data || null)
      setNotice({ type: 'success', text: t('settings.saved') })
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Save failed'
      setNotice({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  const clearAIKey = async () => {
    setNotice(null)
    try {
      setLoading(true)
      const resp = await userAPI.updateAIConfig({ apiKey: '', usePersonalKey: false })
      setAiConfig(resp.data || null)
      setNotice({ type: 'success', text: t('settings.saved') })
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Save failed'
      setNotice({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  const deleteAIConfig = async () => {
    setNotice(null)
    const ok = window.confirm(t('settings.confirmDelete'))
    if (!ok) return
    try {
      setLoading(true)
      await userAPI.deleteAIConfig()
      const resp = await userAPI.getAIConfig()
      setAiConfig(resp.data || null)
      setNotice({ type: 'success', text: t('settings.deleted') })
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Delete failed'
      setNotice({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  const saveConsent = async () => {
    setNotice(null)
    try {
      setLoading(true)
      const resp = await userAPI.updateConsent(consentDraft)
      setProfile(resp.data || null)
      setNotice({ type: 'success', text: t('settings.saved') })
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Save failed'
      setNotice({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  const revokeDevice = async (id) => {
    setNotice(null)
    const ok = window.confirm(t('settings.confirmRevoke'))
    if (!ok) return

    // Check if revoking the current session (which requires a full logout)
    const target = (devices || []).find((x) => x?.id === id)
    if (target?.current) {
      logout()
      navigate('/')
      return
    }

    // Optimistic remove so the UI feels instant
    setDevices((prev) => (prev || []).filter((x) => x?.id !== id))
    setLoading(true)
    try {
      await userAPI.revokeDevice(id)
      // Sync with server to confirm
      const resp = await userAPI.listDevices()
      const list = Array.isArray(resp.data) ? resp.data : []
      setDevices(list.filter((x) => !x?.revokedAt))
      setNotice({ type: 'success', text: t('settings.saved') })
    } catch (err) {
      // Restore the removed item on failure
      setDevices((prev) => (target ? [...(prev || []), target] : prev || []))
      const msg = err?.response?.data?.error || err?.message || 'Action failed'
      setNotice({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sf-page">
      <div className="main-frame">
        <TopNav />

        <div className="sf-scroll">
          <main style={{ display: 'grid', gap: 18, paddingBottom: 18 }}>
            {!isAuthenticated ? (
              <div
                style={{
                  border: `3px solid var(--ink)`,
                  borderRadius: 24,
                  padding: 18,
                  background: 'white',
                  fontWeight: 'bold',
                }}
              >
                <div style={{ marginBottom: 10 }}>{t('auth.loginRequired')}</div>
                <button className="btn" type="button" style={{ background: 'var(--btn-add-bg)' }} onClick={() => navigate('/auth')}>
                  {t('home.auth')}
                </button>
              </div>
            ) : null}

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

            {isAuthenticated ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <Card title={t('settings.profile')} color="white">
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 999,
                        border: `3px solid var(--ink)`,
                        background: 'var(--active-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: 22,
                        overflow: 'hidden',
                      }}
                    >
                      {profile?.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        initials
                      )}
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 'bold', fontSize: 16 }}>{profile?.username || user?.username || ''}</span>
                        <button
                          type="button"
                          onClick={changeUsername}
                          title={t('settings.changeUsername')}
                          disabled={loading}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 2,
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.65,
                            lineHeight: 1,
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </div>
                      <div style={{ opacity: 0.85 }}>{profile?.email || user?.email || ''}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                    <button className="btn" type="button" style={{ background: 'var(--active-bg)' }} onClick={changeEmail} disabled={loading}>
                      {t('settings.changeEmail')}
                    </button>
                    <button className="btn" type="button" style={{ background: 'var(--btn-delete-bg)' }} onClick={() => { logout(); navigate('/') }} disabled={loading}>
                      {t('settings.logout')}
                    </button>
                  </div>
                </Card>

                <Card title={t('settings.preferences')} color="var(--btn-edit-bg)">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontWeight: 'bold' }}>{t('settings.languages')}</div>
                    <button className="btn" type="button" style={{ background: 'white' }} onClick={() => toggleLanguage()} disabled={loading}>
                      {t('settings.toggle')}
                    </button>
                  </div>
                </Card>
              </div>
            ) : null}

            {isAuthenticated ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <Card title={t('settings.modules')} color="var(--panel-progress)">
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10 }}>
                      <input
                        value={moduleDraft.name}
                        onChange={(e) => setModuleDraft((s) => ({ ...s, name: e.target.value }))}
                        placeholder={t('settings.moduleName')}
                        style={{ padding: '10px 12px', borderRadius: 12, border: `2px solid var(--ink)`, fontWeight: 'bold' }}
                        disabled={loading}
                      />
                      <input
                        type="color"
                        value={normalizeColorHex(moduleDraft.colorCode)}
                        onChange={(e) => setModuleDraft((s) => ({ ...s, colorCode: e.target.value }))}
                        style={{ height: 44, padding: 4, borderRadius: 12, border: `2px solid var(--ink)`, background: 'white' }}
                        disabled={loading}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button className="btn" type="button" style={{ background: 'var(--btn-add-bg)' }} onClick={saveModule} disabled={loading}>
                        {editingModuleId ? t('settings.update') : t('settings.create')}
                      </button>
                      <button
                        className="btn"
                        type="button"
                        style={{ background: 'white' }}
                        onClick={() => { setEditingModuleId(null); setModuleDraft({ name: '', colorCode: '#3f51b5' }) }}
                        disabled={loading}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                    <div style={{ borderTop: `2px solid var(--ink)`, opacity: 0.5 }} />
                    <div style={{ display: 'grid', gap: 8, maxHeight: 220, overflow: 'auto', paddingRight: 4 }}>
                      {(modules || []).map((m) => (
                        <div
                          key={m._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            border: `2px solid var(--ink)`,
                            borderRadius: 14,
                            padding: '8px 10px',
                            background: 'white',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 99, border: `2px solid var(--ink)`, background: m.colorCode || '#3f51b5' }} />
                            <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.name}>
                              {m.name}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn" type="button" style={{ background: 'var(--btn-edit-bg)', padding: '8px 10px' }} onClick={() => startEditModule(m)} disabled={loading}>
                              {t('settings.edit')}
                            </button>
                            <button className="btn" type="button" style={{ background: 'var(--btn-delete-bg)', padding: '8px 10px' }} onClick={() => deleteModule(m._id)} disabled={loading}>
                              {t('tasks.delete')}
                            </button>
                          </div>
                        </div>
                      ))}
                      {!modules?.length ? <div style={{ opacity: 0.75, fontWeight: 'bold' }}>{t('settings.empty')}</div> : null}
                    </div>
                  </div>
                </Card>

                <Card title={t('settings.aiConfig')} color="var(--panel-review)">
                  <div style={{ display: 'grid', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 'bold' }}>
                      <input
                        type="checkbox"
                        checked={!!aiDraft.usePersonalKey}
                        onChange={(e) => setAiDraft((s) => ({ ...s, usePersonalKey: e.target.checked }))}
                        disabled={loading}
                      />
                      {t('settings.usePersonalKey')}
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <div style={{ fontWeight: 'bold' }}>{t('settings.model')}</div>
                      <input
                        value={aiDraft.model}
                        onChange={(e) => setAiDraft((s) => ({ ...s, model: e.target.value }))}
                        placeholder={t('settings.modelPlaceholder')}
                        style={{ padding: '10px 12px', borderRadius: 12, border: `2px solid var(--ink)`, fontWeight: 'bold' }}
                        disabled={loading}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <div style={{ fontWeight: 'bold' }}>{t('settings.apiKey')}</div>
                      <input
                        value={aiDraft.apiKey}
                        onChange={(e) => setAiDraft((s) => ({ ...s, apiKey: e.target.value }))}
                        placeholder={aiConfig?.hasApiKey ? t('settings.apiKeySaved') : t('settings.apiKeyPlaceholder')}
                        type="password"
                        style={{ padding: '10px 12px', borderRadius: 12, border: `2px solid var(--ink)`, fontWeight: 'bold' }}
                        disabled={loading}
                      />
                    </label>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button className="btn" type="button" style={{ background: 'var(--btn-add-bg)' }} onClick={saveAIConfig} disabled={loading}>
                        {t('common.save')}
                      </button>
                      <button className="btn" type="button" style={{ background: 'white' }} onClick={clearAIKey} disabled={loading}>
                        {t('settings.clearKey')}
                      </button>
                      <button className="btn" type="button" style={{ background: 'var(--btn-delete-bg)' }} onClick={deleteAIConfig} disabled={loading}>
                        {t('settings.deleteConfig')}
                      </button>
                    </div>
                    <div style={{ opacity: 0.85, fontSize: 12, fontWeight: 'bold' }}>{t('settings.aiConfigHint')}</div>
                  </div>
                </Card>
              </div>
            ) : null}

            {isAuthenticated ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <Card title={t('settings.privacy')} color="var(--panel-done)">
                  <div style={{ display: 'grid', gap: 10 }}>
                    <button className="btn" type="button" style={{ background: 'white' }} onClick={() => setPolicyOpen(true)} disabled={loading}>
                      {t('settings.viewPolicy')}
                    </button>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 'bold' }}>
                      <input
                        type="checkbox"
                        checked={!!consentDraft}
                        onChange={(e) => setConsentDraft(e.target.checked)}
                        disabled={loading}
                      />
                      {t('settings.acceptPolicy')}
                    </label>
                    <div style={{ opacity: 0.85, fontSize: 12 }}>
                      {profile?.dataSharingAcceptedAt ? `${t('settings.signedAt')} ${formatDateTime(profile.dataSharingAcceptedAt)}` : t('settings.notSigned')}
                    </div>
                    <button className="btn" type="button" style={{ background: 'var(--btn-add-bg)' }} onClick={saveConsent} disabled={loading}>
                      {t('common.save')}
                    </button>
                  </div>
                </Card>

                <Card title={t('settings.deviceManagement')} color="var(--btn-edit-bg)">
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflow: 'auto', paddingRight: 4 }}>
                      {(devices || []).map((d) => (
                        <div
                          key={d.id}
                          style={{
                            border: `2px solid var(--ink)`,
                            borderRadius: 14,
                            padding: '10px 12px',
                            background: 'white',
                            display: 'grid',
                            gap: 6,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                            <div style={{ fontWeight: 'bold', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.deviceName || d.userAgent || ''}>
                              {d.deviceName || t('settings.unknownDevice')}{d.current ? ` · ${t('settings.thisDevice')}` : ''}
                            </div>
                            <button
                              className="btn"
                              type="button"
                              style={{ background: 'var(--btn-delete-bg)', padding: '8px 10px' }}
                              onClick={() => revokeDevice(d.id)}
                              disabled={loading}
                            >
                              {t('settings.signOut')}
                            </button>
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.userAgent || ''}>
                            {d.userAgent || ''}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.85 }}>
                            {t('settings.lastSeen')}: {formatDateTime(d.lastSeenAt)}
                          </div>
                        </div>
                      ))}
                      {!devices?.length ? <div style={{ opacity: 0.75, fontWeight: 'bold' }}>{t('settings.empty')}</div> : null}
                    </div>
                    <button className="btn" type="button" style={{ background: 'white' }} onClick={loadAll} disabled={loading}>
                      {t('settings.refresh')}
                    </button>
                  </div>
                </Card>
              </div>
            ) : null}
          </main>
        </div>
      </div>
      <Modal open={policyOpen} title={t('settings.privacyPolicy')} onClose={() => setPolicyOpen(false)}>
        <div style={{ display: 'grid', gap: 10, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 'bold' }}>{t('settings.policyIntroTitle')}</div>
          <div style={{ opacity: 0.9 }}>{t('settings.policyIntroBody')}</div>
          <div style={{ fontWeight: 'bold' }}>{t('settings.policyDataTitle')}</div>
          <div style={{ opacity: 0.9 }}>{t('settings.policyDataBody')}</div>
          <div style={{ fontWeight: 'bold' }}>{t('settings.policyControlTitle')}</div>
          <div style={{ opacity: 0.9 }}>{t('settings.policyControlBody')}</div>
        </div>
      </Modal>
    </div>
  )
}
