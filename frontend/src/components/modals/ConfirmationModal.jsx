import React, { useEffect, useId, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import BrandLogo from '../branding/BrandLogo';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // "danger" for delete, "warning" for logout, "areaDelete" for area reports
  loading // when passed, the caller manages closing the modal itself (e.g. after an async request finishes)
}) => {
  const managesOwnClose = loading !== undefined;
  const isLoading = !!loading;
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const isLoadingRef = useRef(isLoading);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const messageId = useId();

  isLoadingRef.current = isLoading;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFrame = window.requestAnimationFrame(() => {
      if (!isLoadingRef.current && cancelButtonRef.current) {
        cancelButtonRef.current.focus();
      } else {
        dialogRef.current?.focus();
      }
    });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoadingRef.current) {
        onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusable.length === 0) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (previousFocusRef.current instanceof HTMLElement && previousFocusRef.current.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isLoading) return;
    onConfirm();
    if (!managesOwnClose) {
      onClose();
    }
  };

  const handleBackdropOrCancel = () => {
    if (isLoading) return;
    onClose();
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
          confirmButton: "bg-red-600 hover:bg-red-700 text-white",
          cancelButton: "bg-gray-200 hover:bg-gray-300 text-gray-800"
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
          confirmButton: "bg-yellow-600 hover:bg-yellow-700 text-white",
          cancelButton: "bg-gray-200 hover:bg-gray-300 text-gray-800"
        };
      case 'logout':
        return {
          icon: null,
          confirmButton: "bg-[#002349] hover:bg-[#1a3a5c] text-white",
          cancelButton: "bg-gray-100 hover:bg-gray-200 text-gray-700"
        };
      case 'areaDelete':
        return {
          icon: null,
          confirmButton: "bg-red-600 hover:bg-red-700 text-white",
          cancelButton: "bg-gray-100 hover:bg-gray-200 text-gray-700"
        };
      default:
        return {
          icon: <AlertTriangle className="w-6 h-6 text-blue-600" />,
          confirmButton: "bg-blue-600 hover:bg-blue-700 text-white",
          cancelButton: "bg-gray-200 hover:bg-gray-300 text-gray-800"
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={handleBackdropOrCancel} aria-hidden="true"></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={messageId}
          tabIndex={-1}
          className="relative flex max-h-[90dvh] w-full max-w-md flex-col rounded-2xl border border-gray-200 bg-white shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 p-6">
            <div className="flex min-w-0 items-center space-x-3">
              {type === 'logout' || type === 'areaDelete' ? (
                <BrandLogo alt="JIH Logo" size="sm" className="h-10" />
              ) : (
                styles.icon
              )}
              <h3 id={titleId} className="break-words text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <button
              onClick={handleBackdropOrCancel}
              disabled={isLoading}
              aria-label="Close"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
            <p id={messageId} className="text-gray-600">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 px-6 pb-6">
            <button
              ref={cancelButtonRef}
              onClick={handleBackdropOrCancel}
              disabled={isLoading}
              className={`min-h-[44px] px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${styles.cancelButton}`}
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`min-h-[44px] px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-60 flex items-center gap-2 ${styles.confirmButton}`}
            >
              {isLoading && (
                <span className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
              )}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
