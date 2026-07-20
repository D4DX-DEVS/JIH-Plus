import React, { useState, useEffect } from 'react';
import { Lightbulb, X } from 'lucide-react';

const SuggestionModal = ({
  isOpen,
  onClose,
  onSubmit,
  title = 'Add Suggestions',
  message = 'You can provide additional notes or suggestions below.',
  confirmText = 'Submit',
  cancelText = 'Cancel',
  placeholder = 'Enter suggestions...',
  required = false
}) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setValue('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (required && !value.trim()) {
      setError('This field is required');
      return;
    }
    onSubmit(value.trim());
    setValue('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setValue('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 backdrop-blur-sm transition-opacity" onClick={handleClose}></div>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Lightbulb className="w-6 h-6 text-[#002349]" />
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <p className="text-gray-600 mb-4">{message}</p>
            <textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError('');
              }}
              placeholder={placeholder}
              rows="4"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#002349] focus:border-transparent transition-all ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              {cancelText}
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-[#002349] hover:bg-[#1a3a5c] text-white"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuggestionModal;



