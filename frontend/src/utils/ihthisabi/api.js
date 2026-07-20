import axios from 'axios'
import errorEvents from '../errorEvents'

// Suppress duplicate modals if the same error fires multiple times within a short window
let lastErrorKey = null
let lastErrorTime = 0
const ERROR_DEBOUNCE_MS = 2000

function emitError(payload) {
  const key = payload.type + (payload.detail || '')
  const now = Date.now()
  if (key === lastErrorKey && now - lastErrorTime < ERROR_DEBOUNCE_MS) return
  lastErrorKey = key
  lastErrorTime = now
  errorEvents.emit(payload)
}

// Create axios instance
const resolvedBaseUrl = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:4001/api'

const api = axios.create({
  baseURL: resolvedBaseUrl,
  timeout: 120000, // 120 seconds for very large file uploads
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    config.params = {
      ...config.params,
      _t: Date.now()
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401: {
          // Handle 401 errors based on endpoint type
          const isAuthCheck = error.config?.url?.includes('/auth/me')
          const isLoginEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/admin/login')
          const isRegisterEndpoint = error.config?.url?.includes('/auth/register')
          const isAdminEndpoint = error.config?.url?.includes('/admin/')

          if (isAuthCheck || isLoginEndpoint || isRegisterEndpoint) {
            console.log('Auth endpoint failed:', data.message)
            console.log('Endpoint:', error.config?.url)
          } else if (isAdminEndpoint) {
            if (data.message && (data.message.includes('expired') || data.message.includes('invalid'))) {
              console.log('Admin token expired or invalid - logging out')
              localStorage.removeItem('token')
              delete api.defaults.headers.common['Authorization']
              if (window.location.pathname !== '/login') {
                window.location.href = '/login'
              }
            } else {
              console.log('Admin endpoint error (not auth-related):', data.message)
            }
          } else {
            console.log('401 Unauthorized - clearing token and redirecting to login')
            localStorage.removeItem('token')
            delete api.defaults.headers.common['Authorization']
            if (window.location.pathname !== '/login') {
              window.location.href = '/login'
            }
          }
          break
        }
        case 403:
          console.error('Access forbidden:', data.message)
          emitError({ type: 'forbidden', detail: data.message })
          break
        case 404:
          // 404s are usually handled silently by the calling code
          console.error('Resource not found:', data.message)
          break
        case 429:
          console.error('Rate limit exceeded:', data.message)
          emitError({ type: 'rate_limit', detail: data.message })
          break
        case 500:
          console.error('Server error:', data.message)
          emitError({ type: 'server_error', detail: data.message })
          break
        default:
          console.error('API Error:', data.message || 'Unknown error')
          if (status >= 500) {
            emitError({ type: 'server_error', detail: data.message })
          }
      }
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      // Request timed out
      console.error('Request timeout:', error.message)
      emitError({ type: 'timeout' })
    } else if (error.request) {
      // No response received – network error
      console.error('Network error:', error.message)
      emitError({ type: 'network_error' })
    } else {
      // Error setting up the request
      console.error('Error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

export { api }
