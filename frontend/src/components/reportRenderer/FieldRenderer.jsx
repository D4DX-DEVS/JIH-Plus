import React from 'react';
import FileUploadField from './FileUploadField';
import RowColumnField from './RowColumnField';

// Input width tuned to the kind of value the field type actually holds,
// so a 4-digit count field doesn't stretch as wide as a free-text field.
const FIELD_WIDTH_CLASS = {
  number: 'w-24 sm:w-28',
  phone: 'w-40 sm:w-48',
  date: 'w-40 sm:w-48',
  time: 'w-32 sm:w-36',
  datetime: 'w-56 sm:w-64',
  email: 'w-full sm:w-80',
};

export default function FieldRenderer({ field, value, onChange, disabled = false }) {
  const inputBase =
    'border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-500';
  const widthClass = (type) => FIELD_WIDTH_CLASS[type] || 'w-full';

  const handleChange = (val) => onChange(val);

  switch (field.type) {
    case 'title':
      return (
        <div>
          <h3 className="text-base font-semibold text-gray-800 border-b pb-1 mb-1">
            {field.label}
          </h3>
          {field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
        </div>
      );

    case 'html':
      return (
        <div
          className="prose prose-sm max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: field.label || '' }}
        />
      );

    case 'textarea':
      return (
        <textarea
          rows={field.rows || 4}
          value={value || ''}
          onChange={e => handleChange(e.target.value)}
          placeholder={field.placeholder || ''}
          disabled={disabled}
          className={`${inputBase} w-full`}
        />
      );

    case 'select':
    case 'dropdown':
      return (
        <select
          value={value || ''}
          onChange={e => handleChange(e.target.value)}
          disabled={disabled}
          className={`${inputBase} w-full`}
        >
          <option value="">Select...</option>
          {(field.options || []).map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case 'radio':
      return (
        <div className="space-y-2">
          {(field.options || []).map((opt, i) => (
            <label key={i} className="flex min-h-[44px] items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`field_${field.id}`}
                value={opt}
                checked={value === opt}
                onChange={() => handleChange(opt)}
                disabled={disabled}
                className="text-blue-600"
              />
              <span className="min-w-0 flex-1 break-words text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );

    case 'checkbox': {
      const checked = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {(field.options || []).map((opt, i) => (
            <label key={i} className="flex min-h-[44px] items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checked.includes(opt)}
                onChange={e => {
                  const next = e.target.checked
                    ? [...checked, opt]
                    : checked.filter(v => v !== opt);
                  handleChange(next);
                }}
                disabled={disabled}
                className="rounded text-blue-600"
              />
              <span className="min-w-0 flex-1 break-words text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    case 'multiselect': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-1">
          {(field.options || []).map((opt, i) => (
            <label key={i} className="flex min-h-[44px] items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={e => {
                  const next = e.target.checked
                    ? [...selected, opt]
                    : selected.filter(v => v !== opt);
                  handleChange(next);
                }}
                disabled={disabled}
                className="rounded text-blue-600"
              />
              <span className="min-w-0 flex-1 break-words text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    case 'yesno':
      return (
        <div className="flex gap-3">
          {['Yes', 'No'].map(opt => (
            <label key={opt} className="flex min-h-[44px] items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`field_${field.id}`}
                value={opt}
                checked={value === opt}
                onChange={() => handleChange(opt)}
                disabled={disabled}
                className="text-blue-600"
              />
              <span className="min-w-0 flex-1 break-words text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );

    case 'file':
      return <FileUploadField field={field} value={value} onChange={handleChange} />;

    case 'row':
      return (
        <RowColumnField
          field={field}
          value={value}
          onChange={handleChange}
          disabled={disabled}
        />
      );

    case 'date':
    case 'time':
    case 'datetime': {
      const inputType = field.type === 'datetime' ? 'datetime-local' : field.type;
      return (
        <input
          type={inputType}
          value={value || ''}
          onChange={e => handleChange(e.target.value)}
          disabled={disabled}
          className={`${inputBase} ${widthClass(field.type)}`}
        />
      );
    }

    case 'number':
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={e => handleChange(e.target.value)}
          placeholder={field.placeholder || ''}
          min={field.validation?.min}
          max={field.validation?.max}
          disabled={disabled}
          className={`${inputBase} ${widthClass('number')}`}
        />
      );

    default:
      return (
        <input
          type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
          value={value || ''}
          onChange={e => handleChange(e.target.value)}
          placeholder={field.placeholder || ''}
          disabled={disabled}
          className={`${inputBase} ${widthClass(field.type)}`}
        />
      );
  }
}
