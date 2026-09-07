import React from 'react';

export default function FormSection({ children, className = '' }) {
  return <div className={`min-w-0 max-w-4xl mx-auto bg-white p-2.5 sm:p-6 rounded-xl border border-gray-200 ${className}`}>{children}</div>;
}
