import React, { useState } from 'react';
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
      <div className="fixed inset-0 backdrop-blur-sm transition-opacity" onClick={handleClose}></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <p className="text-gray-600 mb-4">{message}</p>
            <textarea
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
              <p className="mt-2 text-sm text-red-600">{error}</p>
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


