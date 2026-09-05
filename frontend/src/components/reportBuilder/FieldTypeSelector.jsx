import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const FIELD_TYPES = [
  { group: 'Text Input', types: [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'number', label: 'Number' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'url', label: 'URL' },
  ]},
  { group: 'Date & Time', types: [
    { value: 'date', label: 'Date' },
    { value: 'time', label: 'Time' },
    { value: 'datetime', label: 'Date & Time' },
  ]},
  { group: 'Choice', types: [
    { value: 'select', label: 'Dropdown Select' },
    { value: 'radio', label: 'Radio Buttons' },
    { value: 'checkbox', label: 'Checkboxes' },
    { value: 'multiselect', label: 'Multi Select' },
    { value: 'yesno', label: 'Yes / No' },
  ]},
  { group: 'Media & Files', types: [
    { value: 'file', label: 'File Upload' },
  ]},
  { group: 'Layout', types: [
    { value: 'title', label: 'Section Title' },
    { value: 'html', label: 'HTML / Rich Text' },
    { value: 'row', label: 'Table Row/Column' },
  ]},
];

export default function FieldTypeSelector({ onSelect, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-800">Add Field</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 -m-2">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          {FIELD_TYPES.map(group => (
            <div key={group.group}>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{group.group}</p>
              <div className="grid grid-cols-2 gap-2">
                {group.types.map(t => (
                  <button
                    key={t.value}
                    onClick={() => { onSelect(t.value); onClose(); }}
                    className="text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-sm text-gray-700 transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
