import React from 'react'
import { getNextReportQuarter } from '../../utils/ihthisabi/quarterHelper'

// Aged / Patient members never fill a form themselves: from the next report
// quarter their alternative report is submitted automatically
// (backend utils/memberCategory.js).
const OPTIONS = [
  { value: null, label: 'Regular' },
  { value: 'Aged', label: 'Aged' },
  { value: 'Patient', label: 'Patient' },
]

const formatQuarter = (q) => (q?.year && q?.quarter ? `Q${q.quarter} ${q.year}` : null)

export const MemberCategoryBadge = ({ category }) => {
  if (!category) return null
  const tone = category === 'Aged' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
  return <span className={`ih-chip ${tone}`}>{category}</span>
}

const MemberCategoryControl = ({ value, savedValue, savedFrom, onChange, disabled = false }) => {
  const current = value || null
  const saved = savedValue || null
  const next = formatQuarter(getNextReportQuarter())

  let note
  if (current === saved) {
    note = current
      ? `${current} member: the alternative report is submitted automatically from ${formatQuarter(savedFrom) || next} onwards.`
      : 'Regular member: submits the report form every quarter.'
  } else if (current) {
    note = `After saving, reports from ${next} onwards are submitted automatically as ${current}.`
  } else {
    note = `After saving, automatic submission stops from ${next}. Reports already submitted stay.`
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Report category" className="grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => {
          const active = current === option.value
          return (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`min-h-[44px] rounded-lg px-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                active ? 'bg-[#161F2F] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 text-xs text-gray-500">{note}</p>
    </div>
  )
}

export default MemberCategoryControl
