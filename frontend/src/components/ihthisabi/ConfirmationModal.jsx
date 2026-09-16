import React, { useEffect, useId, useRef } from 'react'
import { AlertTriangle, X, CheckCircle } from 'lucide-react'
import BrandLogo from '../branding/BrandLogo'

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
  const dialogRef = useRef(null)
  const cancelButtonRef = useRef(null)
  const previousFocusRef = useRef(null)
  const isLoadingRef = useRef(isLoading)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const messageId = useId()

  isLoadingRef.current = isLoading
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current = document.activeElement
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusFrame = window.requestAnimationFrame(() => {
      if (!isLoadingRef.current && cancelButtonRef.current) {
        cancelButtonRef.current.focus()
      } else {
        dialogRef.current?.focus()
      }
    })

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCloseRef.current()

      if (e.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )

      if (focusable.length === 0) {
        e.preventDefault()
        dialogRef.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousBodyOverflow
      if (previousFocusRef.current instanceof HTMLElement && previousFocusRef.current.isConnected) {
        previousFocusRef.current.focus()
      }
    }
  }, [isOpen])

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
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={messageId}
          tabIndex={-1}
          className="relative my-4 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-lg border-2 border-gray-200 bg-white shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 pt-4 pb-0 border-b border-gray-200">
            <div className="flex min-w-0 flex-1 items-center gap-3 pb-4">
              <div className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                <BrandLogo alt="IHTHISABI Logo" size="xs" />
              </div>
              <h3 id={titleId} className="min-w-0 break-words text-lg font-semibold text-gray-900">
                {title}
              </h3>
            </div>
            <div className="pb-4">
            {!isLoading && (
              <button
                onClick={onClose}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-600"
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
            <p id={messageId} className="text-sm text-gray-600 whitespace-pre-wrap">
              {message}
            </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-4 sm:px-6 pt-0 pb-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div className="pt-4 w-full flex items-center justify-end gap-3">
            <button
              ref={cancelButtonRef}
              onClick={onClose}
              disabled={isLoading}
              className="btn-ghost disabled:bg-gray-200 disabled:text-gray-700 disabled:opacity-100"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
                className={`inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700 disabled:opacity-100 ${
                  confirmText === 'Logout'
                    ? 'bg-[#141D2D] hover:bg-[#1a2538] text-white'
                    : styles.confirmButton
                }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
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
