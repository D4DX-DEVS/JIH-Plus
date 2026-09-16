import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const RejectionModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Reject Application", 
  message = "Please enter the reason for rejection:",
  confirmText = "Reject",
  cancelText = "Cancel"
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const messageId = useId();
  const reasonId = useId();
  const errorId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusableSelector = [
      'button:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    const dialog = dialogRef.current;
    const focusInitial = () => dialog?.querySelector(focusableSelector)?.focus({ preventScroll: true });
    const frame = window.requestAnimationFrame(focusInitial);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;

      const focusable = [...dialog.querySelectorAll(focusableSelector)]
        .filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      const previousFocus = previousFocusRef.current;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }
    onConfirm(rejectionReason);
    setRejectionReason('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setRejectionReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={handleClose}></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={`${messageId}${error ? ` ${errorId}` : ''}`}
          tabIndex="-1"
          className="relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-6">
            <div className="flex min-w-0 items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 id={titleId} className="break-words text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <p id={messageId} className="text-gray-600 mb-4">{message}</p>
            <textarea
              id={reasonId}
              aria-label="Rejection reason"
              aria-invalid={Boolean(error)}
              aria-errormessage={error ? errorId : undefined}
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                setError('');
              }}
              placeholder="Enter rejection reason..."
              rows="4"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {error && (
              <p id={errorId} role="alert" className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="min-h-[44px] px-4 py-2.5 rounded-lg font-medium transition-colors bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className="min-h-[44px] px-4 py-2.5 rounded-lg font-medium transition-colors bg-red-600 hover:bg-red-700 text-white"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectionModal;
