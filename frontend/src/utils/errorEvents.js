/**
 * Simple event bus for firing error events from non-React code (e.g., api.js interceptors).
 * Components subscribe via ErrorContext which listens to this bus.
 */

const ERROR_EVENT = 'app:error'

const errorEvents = {
  emit(errorPayload) {
    window.dispatchEvent(new CustomEvent(ERROR_EVENT, { detail: errorPayload }))
  },

  subscribe(handler) {
    window.addEventListener(ERROR_EVENT, (e) => handler(e.detail))
    return () => window.removeEventListener(ERROR_EVENT, (e) => handler(e.detail))
  },
}

export default errorEvents
