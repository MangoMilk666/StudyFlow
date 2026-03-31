import { useEffect, useState } from 'react'

export function useApiHealth() {
  const [state, setState] = useState({ status: 'loading', data: null })

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 800)

    fetch('/api/health', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => setState({ status: 'ok', data }))
      .catch(() => setState({ status: 'error', data: null }))
      .finally(() => window.clearTimeout(timeoutId))

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  return state
}

