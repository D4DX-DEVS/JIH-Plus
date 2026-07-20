import React from 'react'
import {
  AlertTriangle,
  WifiOff,
  ServerCrash,
  ShieldAlert,
  Clock,
  MessageCircleOff,
  X,
  Info,
} from 'lucide-react'

/**
 * Maps an error type to icon, colour, title, and a user-friendly description.
 */
const ERROR_CONFIG = {
  network_error: {
    icon: WifiOff,
    colour: 'text-orange-500',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    button: 'bg-orange-600 hover:bg-orange-700',
    title: 'Connection Problem',
    description:
      'Unable to reach the server. Please check your internet connection and try again. If the issue persists, the server may be taking time to respond.',
  },
  server_error: {
    icon: ServerCrash,
    colour: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    button: 'bg-red-600 hover:bg-red-700',
    title: 'Server Error',
    description:
      'Our server encountered an unexpected issue. Please try again in a few moments. If the problem continues, the backend might be taking time to respond.',
  },
  timeout: {
    icon: Clock,
    colour: 'text-yellow-500',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    button: 'bg-yellow-600 hover:bg-yellow-700',
    title: 'Request Timed Out',
    description:
      'The request took too long to complete. Your backend might be taking time to respond. Please try again.',
  },
  forbidden: {
    icon: ShieldAlert,
    colour: 'text-purple-500',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    button: 'bg-purple-600 hover:bg-purple-700',
    title: 'Access Denied',
    description:
      "You don't have permission to perform this action. Please contact your administrator if you believe this is a mistake.",
  },
  not_found: {
    icon: Info,
    colour: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    button: 'bg-blue-600 hover:bg-blue-700',
    title: 'Not Found',
    description:
      'The requested information could not be found. Please refresh the page and try again.',
  },
  rate_limit: {
    icon: Clock,
    colour: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    button: 'bg-amber-600 hover:bg-amber-700',
    title: 'Too Many Requests',
    description:
      "You've made too many requests in a short period. Please wait a moment and try again.",
  },
  whatsapp_disconnected: {
    icon: MessageCircleOff,
    colour: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    button: 'bg-green-700 hover:bg-green-800',
    title: 'WhatsApp Account Disconnected',
    description:
      'Your DXING WhatsApp account is currently disconnected. Please log in to app.dxing.in and reconnect your account to resume sending messages.',
  },
  whatsapp_failed: {
    icon: MessageCircleOff,
    colour: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    button: 'bg-green-700 hover:bg-green-800',
    title: 'WhatsApp Notification Failed',
    description:
      'Your action was saved successfully, but the WhatsApp notification could not be delivered. Please check your DXING account connection.',
  },
  generic: {
    icon: AlertTriangle,
    colour: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    button: 'bg-gray-700 hover:bg-gray-800',
    title: 'Something Went Wrong',
    description:
      'An unexpected error occurred. Please try again or contact support if the problem persists.',
  },
}

/**
 * ErrorModal
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - type: keyof ERROR_CONFIG  (defaults to 'generic')
 *  - title?: string            (override default title)
 *  - description?: string      (override default description)
 *  - detail?: string           (optional technical detail shown in small text)
 */
const ErrorModal = ({ isOpen, onClose, type = 'generic', title, description, detail }) => {
  if (!isOpen) return null

  const config = ERROR_CONFIG[type] || ERROR_CONFIG.generic
  const Icon = config.icon
  const displayTitle = title || config.title
  const displayDesc = description || config.description

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-auto border ${config.border}`}
        >
          {/* Header */}
          <div className={`flex items-start justify-between p-6 rounded-t-2xl ${config.bg}`}>
            <div className="flex items-start space-x-3">
              <div className={`mt-0.5 ${config.colour}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 leading-tight">
                {displayTitle}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="ml-4 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-sm text-gray-600 leading-relaxed">{displayDesc}</p>
            {detail && (
              <p className="mt-3 text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-2 break-all">
                {detail}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 pb-6">
            <button
              onClick={onClose}
              className={`px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors ${config.button}`}
            >
              OK, Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorModal
