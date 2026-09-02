import React, { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { api, apiError, MEMBERS_TOKEN_KEY, MEMBERS_USER_KEY } from '../../utils/members/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(MEMBERS_USER_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  // Only the one-time stored-token check on boot. Kept separate from a login
  // request being in flight, so routing never unmounts the login page mid-request.
  const [initializing, setInitializing] = useState(true)

  const persist = useCallback((nextUser, token) => {
    if (token) localStorage.setItem(MEMBERS_TOKEN_KEY, token)
    if (nextUser) localStorage.setItem(MEMBERS_USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(MEMBERS_TOKEN_KEY)
    localStorage.removeItem(MEMBERS_USER_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(MEMBERS_TOKEN_KEY)
    if (!token) {
      setInitializing(false)
      return
    }
    api.get('/auth/me')
      .then(({ data }) => persist(data.user))
      .catch(() => logout())
      .finally(() => setInitializing(false))
  }, [persist, logout])

  const login = useCallback(async (username, password) => {
    try {
      const { data } = await api.post('/auth/login', { username, password })
      persist(data.user, data.token)
      return { success: true, user: data.user }
    } catch (error) {
      return { success: false, message: apiError(error, 'Login failed') }
    }
  }, [persist])

  const roleKey = user?.role?.key || ''
  const value = {
    user,
    roleKey,
    initializing,
    isAuthenticated: Boolean(user),
    isSuperAdmin: Boolean(user?.isSuperAdmin),
    canCreateAccessLinks: Boolean(user?.isSuperAdmin || user?.role?.canCreateAccessLinks),
    login,
    logout,
    refresh: () => api.get('/auth/me').then(({ data }) => persist(data.user)).catch(() => {})
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside the members AuthProvider')
  return ctx
}

export default AuthContext
