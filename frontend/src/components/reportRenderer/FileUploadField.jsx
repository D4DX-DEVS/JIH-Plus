import React from 'react';
import { Upload } from 'lucide-react';

export default function FileUploadField({ field, value, onChange, inputId, ariaInvalid, ariaDescribedBy }) {
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onChange(file);
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-4 text-center transition-colors hover:border-blue-400"
      >
        <Upload size={20} className="mx-auto text-gray-400 mb-1" />
        {value ? (
          <p className="text-sm text-blue-600 break-words">{value.name || String(value)}</p>
        ) : (
          <p className="text-sm text-gray-500 break-words">{field.placeholder || 'Click to upload a file'}</p>
        )}
      </label>
      <input
        id={inputId}
        type="file"
        className="hidden"
        onChange={handleChange}
        accept={field.accept || undefined}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedBy}
      />
      {field.helpText && <p className="text-xs text-gray-400 mt-1">{field.helpText}</p>}
    </div>
  );
}
