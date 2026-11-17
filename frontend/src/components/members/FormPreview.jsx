import React, { useMemo } from 'react'
import { X } from 'lucide-react'
import DynamicFormRenderer from '../reportRenderer/DynamicFormRenderer'
import { IconButton, Spinner, Tabs } from './ui'

const MODES = [
  { value: 'applicant', label: 'Applicant' },
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
    <div className="mbr mbr-canvas fixed inset-0 z-50 flex flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-white/95 px-3 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)] backdrop-blur sm:px-5">
        <IconButton icon={X} label="Close preview" onClick={onClose} size={20} className="-ml-1" />
        <div className="hidden min-w-0 flex-1 sm:block">
          <p className="text-sm font-semibold text-ink">Preview</p>
          <p className="truncate text-xs text-slate-500">
            {mode === 'applicant'
              ? 'Exactly what the applicant sees — role comment sections removed.'
              : 'Full form including every role comment section.'}
          </p>
        </div>
        {onModeChange ? (
          <Tabs tabs={MODES} value={mode} onChange={onModeChange} className="ml-auto !w-auto" />
        ) : (
          <p className="ml-1 text-sm font-semibold text-ink sm:hidden">Preview</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:p-6">
        <div className="mbr-card mbr-form mx-auto max-w-3xl p-4 sm:p-6">
          {loading ? <Spinner /> : (
            <>
              {template?.title && (
                <h2 className="mb-4 text-lg font-bold tracking-tight text-ink [overflow-wrap:anywhere]">{template.title}</h2>
              )}
              {pages.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing to preview yet.</p>
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
