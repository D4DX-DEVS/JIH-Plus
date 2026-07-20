import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import ErrorModal from '../components/modals/ErrorModal'
import errorEvents from '../utils/errorEvents'

const ErrorContext = createContext(null)

/**
 * useError – hook to show the global error modal from any component.
 *
 * showError({ type, title?, description?, detail? })
 *   type: 'network_error' | 'server_error' | 'timeout' | 'forbidden' |
 *         'not_found' | 'rate_limit' | 'whatsapp_disconnected' | 'whatsapp_failed' | 'generic'
 */
export const useError = () => {
  const ctx = useContext(ErrorContext)
  if (!ctx) throw new Error('useError must be used inside ErrorProvider')
  return ctx
}

export const ErrorProvider = ({ children }) => {
  const [errorState, setErrorState] = useState(null) // null = closed

  const showError = useCallback((payload) => {
    setErrorState(payload)
  }, [])

  const hideError = useCallback(() => {
    setErrorState(null)
  }, [])

  // Listen to events emitted from api.js (non-React code)
  useEffect(() => {
    const handler = (payload) => setErrorState(payload)
    window.addEventListener('app:error', (e) => handler(e.detail))
    return () => window.removeEventListener('app:error', (e) => handler(e.detail))
  }, [])

  return (
    <ErrorContext.Provider value={{ showError, hideError }}>
      {children}
      <ErrorModal
        isOpen={!!errorState}
        onClose={hideError}
        type={errorState?.type}
        title={errorState?.title}
        description={errorState?.description}
        detail={errorState?.detail}
      />
    </ErrorContext.Provider>
  )
}
