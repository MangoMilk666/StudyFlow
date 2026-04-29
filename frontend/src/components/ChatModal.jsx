import { useEffect, useMemo, useRef, useState } from 'react'
import { aiAPI } from '../services/api'
import { useAuth } from '../auth'

function Inline({ text }) {
  const parts = []
  let rest = String(text || '')
  let key = 0

  const pushText = (s) => {
    if (!s) return
    parts.push(<span key={`t-${key++}`}>{s}</span>)
  }

  while (rest) {
    const idxCode = rest.indexOf('`')
    const idxBold = rest.indexOf('**')
    const idxLink = rest.indexOf('[')
    const candidates = [idxCode, idxBold, idxLink].filter((x) => x >= 0)
    const nextIdx = candidates.length ? Math.min(...candidates) : -1
    if (nextIdx === -1) {
      pushText(rest)
      break
    }

    if (nextIdx > 0) {
      pushText(rest.slice(0, nextIdx))
      rest = rest.slice(nextIdx)
      continue
    }

    if (idxCode === 0) {
      const end = rest.indexOf('`', 1)
      if (end > 0) {
        const code = rest.slice(1, end)
        parts.push(
          <code
            key={`c-${key++}`}
            style={{
              border: '1px solid var(--ink)',
              borderRadius: 8,
              padding: '1px 6px',
              background: '#f0f0f0',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 13,
            }}
          >
            {code}
          </code>
        )
        rest = rest.slice(end + 1)
        continue
      }
    }

    if (idxBold === 0) {
      const end = rest.indexOf('**', 2)
      if (end > 1) {
        const bold = rest.slice(2, end)
        parts.push(
          <strong key={`b-${key++}`}>
            <Inline text={bold} />
          </strong>
        )
        rest = rest.slice(end + 2)
        continue
      }
    }

    if (idxLink === 0) {
      const close = rest.indexOf(']')
      const openParen = rest.indexOf('(', close + 1)
      const closeParen = rest.indexOf(')', openParen + 1)
      if (close > 0 && openParen === close + 1 && closeParen > openParen + 1) {
        const label = rest.slice(1, close)
        const href = rest.slice(openParen + 1, closeParen)
        parts.push(
          <a
            key={`l-${key++}`}
            href={href}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 'bold' }}
          >
            <Inline text={label} />
          </a>
        )
        rest = rest.slice(closeParen + 1)
        continue
      }
    }

    pushText(rest[0])
    rest = rest.slice(1)
  }

  return <>{parts}</>
}

function MarkdownView({ text }) {
  const input = String(text || '')
  const out = []
  let last = 0
  let idx = 0
  const fence = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g
  let m

  const pushPlain = (chunk) => {
    const lines = String(chunk || '').split('\n')
    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      const h = /^(#{1,3})\s+(.*)$/.exec(line)
      if (h) {
        const level = h[1].length
        const title = h[2]
        out.push(
          <div
            key={`h-${idx++}`}
            style={{
              fontWeight: 'bold',
              fontSize: level === 1 ? 18 : level === 2 ? 16 : 15,
              marginTop: 6,
            }}
          >
            <Inline text={title} />
          </div>
        )
        i += 1
        continue
      }

      const li = /^[-*]\s+(.*)$/.exec(line)
      if (li) {
        const items = []
        while (i < lines.length) {
          const li2 = /^[-*]\s+(.*)$/.exec(lines[i])
          if (!li2) break
          items.push(li2[1])
          i += 1
        }
        out.push(
          <ul key={`ul-${idx++}`} style={{ margin: '6px 0 6px 18px', padding: 0 }}>
            {items.map((it, k) => (
              <li key={`li-${idx++}-${k}`} style={{ margin: '2px 0' }}>
                <Inline text={it} />
              </li>
            ))}
          </ul>
        )
        continue
      }

      if (line.trim() === '') {
        out.push(<div key={`sp-${idx++}`} style={{ height: 6 }} />)
        i += 1
        continue
      }

      out.push(
        <div key={`p-${idx++}`} style={{ lineHeight: 1.35 }}>
          <Inline text={line} />
        </div>
      )
      i += 1
    }
  }

  while ((m = fence.exec(input)) !== null) {
    const before = input.slice(last, m.index)
    if (before) pushPlain(before)
    const lang = (m[1] || '').trim()
    const code = m[2] || ''
    out.push(
      <pre
        key={`pre-${idx++}`}
        style={{
          margin: '8px 0',
          padding: 10,
          borderRadius: 14,
          border: `2px solid var(--ink)`,
          background: '#f7f7f7',
          overflow: 'auto',
        }}
      >
        <code
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 13,
            display: 'block',
            whiteSpace: 'pre',
          }}
        >
          {lang ? `${lang}\n${code}` : code}
        </code>
      </pre>
    )
    last = fence.lastIndex
  }
  const after = input.slice(last)
  if (after) pushPlain(after)

  return <div style={{ whiteSpace: 'normal' }}>{out}</div>
}

export default function ChatModal({ open, onClose, t }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [notice, setNotice] = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const listRef = useRef(null)
  const typingTimerRef = useRef(null)

  const storageKey = useMemo(() => {
    const userId = user?.userId ? String(user.userId) : ''
    return userId ? `sf_ai_chat_history_v1:${userId}` : null
  }, [user])

  useEffect(() => {
    if (!storageKey) {
      setMessages([])
      setHydrated(true)
      return
    }
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setMessages(parsed)
      }
    } catch (e) {
    } finally {
      setHydrated(true)
    }
  }, [storageKey])

  useEffect(() => {
    if (!hydrated) return
    if (!storageKey) return
    try {
      const next = Array.isArray(messages) ? messages.slice(-100) : []
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch (e) {}
  }, [hydrated, storageKey, messages])

  useEffect(() => {
    if (!open) return
    setNotice(null)
    setLoading(false)
    setStreaming(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [open, messages, loading, streaming])

  useEffect(
    () => () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
        typingTimerRef.current = null
      }
    },
    []
  )

  const historyPayload = useMemo(
    () =>
      messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content })),
    [messages]
  )

  const startTypewriter = (fullText) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const full = String(fullText || '')
    setStreaming(true)
    setMessages((prev) => [...prev, { id, role: 'assistant', content: '' }])

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }

    let i = 0
    const step = () => {
      i = Math.min(full.length, i + 3)
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: full.slice(0, i) } : m)))
      if (i < full.length) {
        typingTimerRef.current = setTimeout(step, 14)
      } else {
        typingTimerRef.current = null
        setStreaming(false)
      }
    }
    step()
  }

  const send = async () => {
    const text = String(input || '').trim()
    if (!text) return
    if (loading || streaming) return
    setInput('')
    setNotice(null)

    const next = [...messages, { id: `${Date.now()}-u`, role: 'user', content: text }]
    setMessages(next)
    setLoading(true)

    try {
      const resp = await aiAPI.chat(text, historyPayload)
      const reply = String(resp?.data?.reply || '')
      startTypewriter(reply)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || t('ai.sendFailed')
      setNotice({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

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
        zIndex: 95,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: 'min(720px, 100%)',
          height: 'min(70vh, 620px)',
          background: 'white',
          border: `3px solid var(--ink)`,
          borderRadius: 24,
          padding: 16,
          boxShadow: '10px 10px 0 rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h2 style={{ margin: 0 }}>{t('ai.title')}</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="btn"
              style={{ padding: '6px 14px', fontSize: 14, background: '#f0f0f0' }}
              onClick={() => {
                setMessages([])
                if (storageKey) {
                  try {
                    localStorage.removeItem(storageKey)
                  } catch (e) {
                  }
                }
              }}
            >
              {t('ai.clear')}
            </button>
            <button
              type="button"
              className="btn"
              style={{ padding: '6px 14px', fontSize: 14, background: '#f0f0f0' }}
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>

        {notice ? (
          <div
            style={{
              border: `2px solid var(--ink)`,
              borderRadius: 14,
              padding: '10px 12px',
              background: 'var(--btn-delete-bg)',
              fontWeight: 'bold',
            }}
          >
            {notice.text}
          </div>
        ) : null}

        <div
          ref={listRef}
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'auto',
            border: `2px solid var(--ink)`,
            borderRadius: 18,
            padding: 12,
            background: '#fafafa',
          }}
        >
          {!messages.length ? (
            <div style={{ opacity: 0.7, fontWeight: 'bold' }}>{t('ai.hint')}</div>
          ) : null}

          <div style={{ display: 'grid', gap: 10 }}>
            {messages.map((m, idx) => (
              <div
                key={m.id ? String(m.id) : String(idx)}
                style={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    border: `2px solid var(--ink)`,
                    borderRadius: 16,
                    padding: '10px 12px',
                    background: m.role === 'user' ? 'var(--active-bg)' : 'white',
                    fontWeight: m.role === 'user' ? 'bold' : 'normal',
                  }}
                >
                  {m.role === 'assistant' ? <MarkdownView text={m.content} /> : <Inline text={m.content} />}
                </div>
              </div>
            ))}

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '85%',
                    border: `2px solid var(--ink)`,
                    borderRadius: 16,
                    padding: '10px 12px',
                    background: 'white',
                    opacity: 0.8,
                    fontWeight: 'bold',
                  }}
                >
                  {t('ai.thinking')}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={t('ai.placeholder')}
            style={{
              flex: '1 1 auto',
              padding: '10px 12px',
              borderRadius: 12,
              border: `3px solid var(--ink)`,
              boxShadow: '4px 4px 0 var(--ink)',
              fontWeight: 'bold',
              outline: 'none',
            }}
          />
          <button
            type="button"
            className="btn"
            disabled={loading || streaming}
            onClick={send}
            style={{ background: 'var(--btn-add-bg)' }}
          >
            {t('ai.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
