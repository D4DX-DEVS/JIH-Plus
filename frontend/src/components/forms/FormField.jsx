import React from 'react';

/** Shared stacked field spacing for all portals. Children retain their own
 * value/change/validation handlers; the wrapping label names the control. */
export default function FormField({ label, hint, children, required, className = '' }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-sm font-medium leading-snug text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}
