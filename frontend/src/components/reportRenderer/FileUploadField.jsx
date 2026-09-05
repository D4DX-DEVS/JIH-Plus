import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

export default function FileUploadField({ field, value, onChange }) {
  const ref = useRef();
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onChange(file);
  };

  return (
    <div>
      <div
        onClick={() => ref.current.click()}
        className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-4 text-center cursor-pointer transition-colors"
      >
        <Upload size={20} className="mx-auto text-gray-400 mb-1" />
        {value ? (
          <p className="text-sm text-blue-600 break-words">{value.name || String(value)}</p>
        ) : (
          <p className="text-sm text-gray-500 break-words">{field.placeholder || 'Click to upload a file'}</p>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        className="hidden"
        onChange={handleChange}
        accept={field.accept || undefined}
      />
      {field.helpText && <p className="text-xs text-gray-400 mt-1">{field.helpText}</p>}
    </div>
  );
}
