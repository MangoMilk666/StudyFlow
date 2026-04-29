import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authAPI } from '../services/api'

const LS_USER_KEY = 'sf_user_v1'
const LS_TOKEN_KEY = 'sf_token_v1'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  useEffect(() => {
    const storedUser = localStorage.getItem(LS_USER_KEY)
    const storedToken = localStorage.getItem(LS_TOKEN_KEY)
    if (storedUser) setUser(JSON.parse(storedUser))
    if (storedToken) setToken(storedToken)
  }, [])

  const login = useCallback((userData, nextToken) => {
    localStorage.setItem(LS_USER_KEY, JSON.stringify(userData))
    localStorage.setItem(LS_TOKEN_KEY, nextToken)
    setUser(userData)
    setToken(nextToken)
  }, [])

  const logout = useCallback(() => {
    // Best-effort: revoke session on backend before clearing local state
    authAPI.logout().catch(() => {})
    localStorage.removeItem(LS_USER_KEY)
    localStorage.removeItem(LS_TOKEN_KEY)
    setUser(null)
    setToken(null)
  }, [])

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = prev ? { ...prev, ...patch } : prev
      if (next) localStorage.setItem(LS_USER_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ user, token, login, logout, updateUser, isAuthenticated: !!user && !!token }),
    [user, token, login, logout, updateUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

