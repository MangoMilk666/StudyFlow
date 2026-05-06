import { useEffect, useState } from 'react'

import { metaAPI } from '../services/api'

const SS_KEY = 'sf_app_version_v1'

export function useAppVersion() {
  const [version, setVersion] = useState('')

  useEffect(() => {
    let alive = true
    try {
      const cached = sessionStorage.getItem(SS_KEY)
      if (cached) {
        setVersion(String(cached))
      }
    } catch {
      // ignore
    }

    metaAPI
      .getVersion()
      .then((resp) => {
        const v = String(resp?.data?.version || '').trim()
        if (!alive) return
        if (!v || v === 'unknown') return
        setVersion(v)
        try {
          sessionStorage.setItem(SS_KEY, v)
        } catch {
          // ignore
        }
      })
      .catch(() => {})

    return () => {
      alive = false
    }
  }, [])

  return version
}

