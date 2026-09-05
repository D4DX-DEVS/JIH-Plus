import React, { useEffect } from 'react'
import { AlertTriangle, X, CheckCircle } from 'lucide-react'
import LogoColor from '../../assets/LogoColor.png'

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger', 'warning', 'info'
  isLoading = false
}) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const variantStyles = {
    danger: {
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
      borderColor: 'border-red-200'
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      confirmButton: 'bg-amber-600 hover:bg-amber-700 text-white',
      borderColor: 'border-amber-200'
    },
    info: {
      icon: CheckCircle,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
      borderColor: 'border-blue-200'
    }
  }

  const styles = variantStyles[variant] || variantStyles.danger
  const Icon = styles.icon

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-white/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full border-2 border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-0 border-b border-gray-200">
            <div className="flex items-center gap-3 pb-4 min-w-0">
              <div className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src={LogoColor}
                  alt="IHTHISABI Logo"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 min-w-0 break-words">
                {title}
              </h3>
            </div>
            <div className="pb-4">
            {!isLoading && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2 rounded-full"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            </div>
          </div>

          {/* Body */}
          <div className="px-4 sm:px-6 pt-0 pb-0">
            <div className="py-4">
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {message}
            </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-4 sm:px-6 pt-0 pb-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div className="pt-4 w-full flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="btn-ghost"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
                className={`inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  confirmText === 'Logout'
                    ? 'bg-[#141D2D] hover:bg-[#1a2538] text-white'
                    : styles.confirmButton
                }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                confirmText
              )}
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmationModal


