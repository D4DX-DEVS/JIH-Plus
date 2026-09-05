import React, { createContext, useContext, useReducer, useEffect, useState } from 'react'
import { api } from '../../utils/ihthisabi/api'
import toast from 'react-hot-toast'

const AuthContext = createContext()

// Built fresh on every provider mount. Must NOT be a module-level constant:
// the token would then be frozen at page load, so remounting the provider
// (leaving /ihthisabi and coming back) would resurrect a logged-out token.
const createInitialState = () => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true,
  error: null
})

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
        error: null
      }
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      }
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      }
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      }
    default:
      return state
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, undefined, createInitialState)
  // True only while the one-time stored-token check on app boot is running.
  // Kept separate from state.loading, which also toggles on every login()
  // call — routing must not unmount the login page mid-request just
  // because a login attempt is in flight.
  const [initializing, setInitializing] = useState(true)

  // Set initial auth token in API headers immediately
  useEffect(() => {
    const initialToken = localStorage.getItem('token')
    if (initialToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`
    }
  }, []) // Run only once on mount

  // Update auth token in API headers when state changes
  useEffect(() => {
    if (state.token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
      localStorage.setItem('token', state.token)
    } else {
      delete api.defaults.headers.common['Authorization']
      localStorage.removeItem('token')
    }
  }, [state.token])

  // Function to decode JWT token and extract user data
  const decodeToken = (token) => {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join(''))
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('Error decoding token:', error)
      return null
    }
  }

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (state.token) {
        try {
          // First, try to get user data from token
          const tokenData = decodeToken(state.token)
          if (tokenData && tokenData.userId) {
            // Handle admin users
            if (tokenData.userId === 'admin' && tokenData.isAdmin && tokenData.role === 'admin') {
              const adminUser = {
                id: 'admin',
                role: 'admin',
                email: tokenData.email,
                isAdmin: true,
                name: 'Admin'
              }
              
              // Dispatch success with admin token data immediately
              dispatch({
                type: 'AUTH_SUCCESS',
                payload: {
                  user: adminUser,
                  token: state.token
                }
              })
              return
            }
            
            // Handle regular users
            if (tokenData.userId !== 'admin') {
              // Create user object from token data
              const userFromToken = {
                id: tokenData.userId,
                role: tokenData.role,
                ruknId: tokenData.ruknId,
                unit: tokenData.unit,
                name: tokenData.name
              }
              
              // Dispatch success with token data immediately
              dispatch({
                type: 'AUTH_SUCCESS',
                payload: {
                  user: userFromToken,
                  token: state.token
                }
              })
              
              // Then try to refresh from backend
              try {
                await api.get('/health')
                const response = await api.get('/auth/me')
                dispatch({
                  type: 'AUTH_SUCCESS',
                  payload: {
                  user: response.data.data.user,
                  token: state.token
                }
              })
              } catch (error) {
                // If backend call fails, we still have token data
                console.log('Backend auth check failed, using token data:', error.message)
              }
              return
            }
          }
          
          // If we reach here, the token doesn't have valid user data
          // Try to validate with backend
          try {
            await api.get('/health')
            const response = await api.get('/auth/me')
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: {
                user: response.data.data.user,
                token: state.token
              }
            })
          } catch (error) {
            // If backend validation fails, the token is invalid
            console.log('Backend auth check failed:', error.message)
            dispatch({ 
              type: 'AUTH_FAILURE', 
              payload: 'Invalid token'
            })
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          console.error('Error details:', {
            status: error.response?.status,
            message: error.response?.data?.message,
            url: error.config?.url
          })
          
          // If it's a network error (backend not running), keep the token
          if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
            console.log('Backend not running, keeping token for when it comes online')
            // Set as authenticated with stored token, but mark as potentially stale
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: {
                user: { 
                  username: 'User', 
                  role: 'unknown',
                  isOffline: true 
                },
                token: state.token
              }
            })
          } else if (error.response?.status === 401) {
            // Token is invalid or expired - but only clear if it's a real auth failure
            console.log('Token invalid or expired, clearing authentication')
            console.log('Auth check error details:', error.response?.data)
            dispatch({ 
              type: 'AUTH_FAILURE', 
              payload: null
            })
          } else {
            // Other errors (e.g. 500) are not genuine network failures - treat
            // as an auth failure so the user sees the login page instead of a
            // half-authenticated shell with an unrecognized 'unknown' role.
            console.log('Auth check failed with non-401 error, treating as auth failure')
            dispatch({
              type: 'AUTH_FAILURE',
              payload: null
            })
          }
        }
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: null })
      }
    }

    checkAuth().finally(() => setInitializing(false))
  }, [])

  const login = async (credentials) => {
    dispatch({ type: 'AUTH_START' })
    try {
      let response
      
      // Use different endpoints based on role
      if (credentials.role === 'admin' || credentials.role === 'mainAdmin') {
        // Admin login uses email/password format
        response = await api.post('/auth/admin/login', {
          email: credentials.email,
          password: credentials.password
        })
      } else if (credentials.role === 'unified') {
        // Unified login - auto-detects roles; selectedRole completes a
        // multi-role login after the user picks a role
        response = await api.post('/auth/unified-login', {
          ruknId: credentials.ruknId,
          ...(credentials.selectedRole ? { role: credentials.selectedRole } : {})
        })
      } else if (credentials.role === 'unitAdmin') {
        // Unit admin login via unitAdmin route
        response = await api.post('/unitadmin/login', {
          unit: credentials.unit,
          ruknId: credentials.ruknId
        })
      } else if (credentials.role === 'districtAdmin') {
        // District admin login via districtadmin route
        response = await api.post('/districtadmin/login', {
          district: credentials.district,
          ruknId: credentials.ruknId
        })
      } else {
        // Default fallback to unified login
        response = await api.post('/auth/unified-login', {
          ruknId: credentials.ruknId
        })
      }
      
      // Multi-role account and no role chosen yet: hand the choice back to
      // the caller (LoginPage renders the role picker) without authenticating
      if (response.data.data?.requiresRoleSelection) {
        dispatch({ type: 'AUTH_FAILURE', payload: null })
        return {
          success: true,
          requiresRoleSelection: true,
          ruknId: response.data.data.ruknId,
          name: response.data.data.name,
          availableRoles: response.data.data.availableRoles || []
        }
      }

      const { user, token } = response.data.data

      // Set token header immediately so the next call can use it
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        localStorage.setItem('token', token)
      }

      // Immediately refresh user from backend to ensure latest shape (includes ruknId)
      let freshUser = user
      try {
        const me = await api.get('/auth/me')
        freshUser = me.data?.data?.user || user
      } catch (_) {
        // ignore and fall back to login payload
      }

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: freshUser, token }
      })

      toast.success(`Welcome back, ${freshUser.name || freshUser.username || freshUser.email || 'User'}!`)
      return { success: true, user: freshUser }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      dispatch({ type: 'AUTH_FAILURE', payload: message })
      // Expected auth failures (wrong RUKN ID/password, etc.) are shown inline
      // by the caller (LoginPage) — only toast for unexpected/network errors.
      if (!error.response) {
        toast.error(message)
      }
      return { success: false, error: message }
    }
  }

  const register = async (userData) => {
    dispatch({ type: 'AUTH_START' })
    try {
      const response = await api.post('/auth/register', userData)
      const { user, token } = response.data.data

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token }
      })

      toast.success('Registration successful!')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      dispatch({ type: 'AUTH_FAILURE', payload: message })
      toast.error(message)
      return { success: false, error: message }
    }
  }

  // Switch to another role held by the same RUKN ID (multi-role users)
  const switchRole = async (role) => {
    try {
      const response = await api.post('/auth/switch-role', { role })
      const { user, token } = response.data.data

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      localStorage.setItem('token', token)

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token }
      })

      const roleLabels = {
        districtAdmin: 'District Admin',
        unitAdmin: 'Unit Admin',
        mekhalaNazim: 'Mekhala Nazim',
        rukn: 'Member'
      }
      toast.success(`Switched to ${roleLabels[user.role] || 'Member'}`)
      return { success: true, user }
    } catch (error) {
      const message = error.response?.data?.message || 'Role switch failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = () => {
    // Clear token from localStorage immediately
    localStorage.removeItem('token')
    // Clear token from API headers immediately
    delete api.defaults.headers.common['Authorization']
    // Dispatch logout action
    dispatch({ type: 'LOGOUT' })
    toast.success('Logged out successfully')
  }

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData)
      dispatch({
        type: 'UPDATE_USER',
        payload: response.data.data.user
      })
      toast.success('Profile updated successfully')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const changePassword = async (passwordData) => {
    try {
      await api.put('/auth/change-password', passwordData)
      toast.success('Password changed successfully')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  const value = {
    ...state,
    initializing,
    login,
    register,
    logout,
    switchRole,
    updateProfile,
    changePassword,
    clearError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
