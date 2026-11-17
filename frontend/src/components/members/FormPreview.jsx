import React, { useMemo } from 'react'
import { X } from 'lucide-react'
import DynamicFormRenderer from '../reportRenderer/DynamicFormRenderer'
import { Spinner } from './ui'

const MODES = [
  { value: 'applicant', label: 'Applicant view' },
  { value: 'full', label: 'Full form' },
]

/**
 * Full-screen, read-only preview of a form template.
 * mode 'applicant' strips role comment pages/fields — exactly what the
 * applicant receives; 'full' shows every section. Pass onModeChange to let
 * the viewer switch between the two from the header.
 */
export default function FormPreview({ template, mode, onModeChange, onClose, loading = false }) {
  const pages = useMemo(() => {
    const all = template?.pages || []
    if (mode === 'full') return all
    return all
      .filter(p => p.audience !== 'role')
      .map(p => ({ ...p, fields: (p.fields || []).filter(f => f.audience !== 'role') }))
      .filter(p => (p.fields || []).length > 0)
  }, [template, mode])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={onClose} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 -ml-2 p-2 flex-shrink-0">
          <X size={18} /> <span className="text-sm font-medium">Close preview</span>
        </button>
        <span className="hidden sm:block flex-1 min-w-0 text-sm text-gray-500 truncate">
          {mode === 'applicant'
            ? 'Exactly what the applicant sees — role comment sections removed.'
            : 'Full form including every role comment section.'}
        </span>
        {onModeChange && (
          <div className="ml-auto flex flex-shrink-0 gap-1 p-1 bg-gray-100 rounded-lg">
            {MODES.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => onModeChange(m.value)}
                className={`min-h-[44px] lg:min-h-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === m.value ? 'bg-white text-[#5b21b6] shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
          {loading ? <Spinner /> : (
            <>
              {template?.title && (
                <h2 className="text-lg font-semibold text-gray-900 mb-4 break-words">{template.title}</h2>
              )}
              {pages.length === 0 ? (
                <p className="text-sm text-gray-500">Nothing to preview yet.</p>
              ) : (
                <DynamicFormRenderer key={mode} report={{ ...template, pages }} onSubmit={() => {}} disabled />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
