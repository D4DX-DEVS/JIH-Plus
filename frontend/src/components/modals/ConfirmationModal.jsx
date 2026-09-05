import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import jihLogo from '../../assets/LogoColor.png';

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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

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
      <div className="fixed inset-0 backdrop-blur-sm transition-opacity" onClick={handleBackdropOrCancel}></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-auto border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-3">
              {type === 'logout' || type === 'areaDelete' ? (
                <img src={jihLogo} alt="JIH Logo" className="w-10 h-10 object-contain" />
              ) : (
                styles.icon
              )}
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <button
              onClick={handleBackdropOrCancel}
              disabled={isLoading}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-2">
            <p className="text-gray-600">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 px-6 pb-6">
            <button
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
