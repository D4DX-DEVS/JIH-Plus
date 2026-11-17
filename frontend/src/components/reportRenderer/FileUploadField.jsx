import React from 'react';
import { ExternalLink, FileText, Upload } from 'lucide-react';

const IMAGE_URL = /^data:image\/|\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i;

/** Read-only view of a stored upload: a thumbnail for images, a link otherwise. */
function StoredFile({ value }) {
  const url = typeof value === 'string' ? value : '';
  if (!url) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
        <Upload size={20} className="mx-auto text-gray-300 mb-1" />
        <p className="text-sm text-gray-400">No file uploaded</p>
      </div>
    );
  }
  const isImage = IMAGE_URL.test(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex max-w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2 pr-3 text-sm text-blue-700 hover:border-blue-300 hover:bg-blue-50"
    >
      {isImage ? (
        <img src={url} alt="Uploaded file" className="h-20 w-20 flex-shrink-0 rounded-md object-cover bg-white" />
      ) : (
        <FileText size={20} className="flex-shrink-0 text-gray-400" />
      )}
      <span className="inline-flex items-center gap-1 font-medium">
        Open file <ExternalLink size={14} />
      </span>
    </a>
  );
}

export default function FileUploadField({ field, value, onChange, inputId, ariaInvalid, ariaDescribedBy, disabled = false }) {
  if (disabled) return <StoredFile value={value} />;

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onChange(file);
  };
  return (
    <div>
      <label
        htmlFor={inputId}
        data-fr="upload"
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
