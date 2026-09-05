import React, { useEffect } from 'react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'

/** Small shared primitives so the members pages stay short and consistent. */

/** Rows every list page requests per page. */
export const PAGE_SIZE = 10

/**
 * `hideTitleOnMobile` is for pages whose title now duplicates the Layout mobile
 * app bar (see components/members/Layout.jsx's PAGE_TITLES). Actions stay
 * visible on mobile either way — they're controls, not the duplicated title.
 */
export function PageHeader({ title, subtitle, actions, hideTitleOnMobile }) {
  return (
    <div className={`${hideTitleOnMobile && !actions ? 'hidden lg:flex' : 'flex'} flex-wrap items-start justify-between gap-3 mb-6`}>
      <div className={`min-w-0 ${hideTitleOnMobile ? 'hidden lg:block' : ''}`}>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 break-words">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white border border-gray-200/80 rounded-xl shadow-sm ${className}`}>{children}</div>
  )
}

const BUTTON_VARIANTS = {
  primary: 'bg-gradient-to-r from-[#6d28d9] to-[#5b21b6] text-white hover:from-[#5b21b6] hover:to-[#4c1d95] shadow-sm disabled:from-[#c4b5fd] disabled:to-[#c4b5fd] disabled:shadow-none',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:bg-red-300',
  ghost: 'text-gray-600 hover:bg-gray-100'
}

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4b5fd] focus-visible:ring-offset-1 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Field({ label, hint, children, required }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-gray-500 mt-1.5">{hint}</span>}
    </label>
  )
}

const CONTROL = 'w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-base sm:text-sm outline-none transition-shadow focus:ring-2 focus:ring-[#c4b5fd] focus:border-[#7c3aed] disabled:bg-gray-50 disabled:text-gray-500'

export function Input({ className = '', ...props }) {
  return <input {...props} className={`${CONTROL} ${className}`} />
}

export function Textarea({ className = '', ...props }) {
  return <textarea {...props} className={`${CONTROL} ${className}`} />
}

export function Select({ className = '', children, ...props }) {
  return <select {...props} className={`${CONTROL} ${className}`}>{children}</select>
}

/** Search box with the magnifier affordance every list page uses. */
export function SearchInput({ className = '', ...props }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input {...props} className={`${CONTROL} pl-9`} />
    </div>
  )
}

/**
 * One filter row for every list page: a search box, any number of selects, and
 * a Clear that only appears once something is actually filtering.
 */
export function FilterBar({ children, onClear, active = false, className = '' }) {
  return (
    <Card className={`p-4 mb-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        {children}
        {active && onClear && (
          <button
            onClick={onClear}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 whitespace-nowrap"
          >
            <X size={15} /> Clear filters
          </button>
        )}
      </div>
    </Card>
  )
}

/** Segmented tab switcher shared by Master Data, Workflows and the form builder. */
export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex flex-wrap items-center gap-1 p-1 bg-gray-100 rounded-xl ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            value === tab.value
              ? 'bg-white text-[#5b21b6] shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {tab.label}
          {tab.badge !== undefined && (
            <span className={`ml-1.5 text-xs ${value === tab.value ? 'text-[#8b5cf6]' : 'text-gray-400'}`}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative bg-white w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 -m-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function Spinner({ label = 'Loading...' }) {
  return (
    <div className="py-16 text-center">
      <div className="w-8 h-8 mx-auto mb-3 border-2 border-gray-200 border-t-[#5b21b6] rounded-full animate-spin" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="py-14 px-4 text-center">
      <p className="font-medium text-gray-900">{title}</p>
      {message && <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

const STATUS_STYLES = {
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  in_review: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  hold: 'bg-gray-100 text-gray-700 border-gray-200',
  active: 'bg-green-50 text-green-700 border-green-200',
  used: 'bg-blue-50 text-blue-700 border-blue-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-gray-100 text-gray-600 border-gray-200'
}

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize ${style}`}>
      {String(status || '').replace(/_/g, ' ')}
    </span>
  )
}

/** Table that scrolls horizontally on its own rather than the page body. */
export function TableWrap({ children }) {
  return <div className="overflow-x-auto rounded-b-xl">{children}</div>
}

/**
 * Server-side pager shared by every list page. Renders nothing when everything
 * fits on one page, so callers can drop it in unconditionally.
 */
export function Pagination({ page, total, limit = PAGE_SIZE, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit))
  if (total <= limit) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  // A short window around the current page keeps the control usable at 50+ pages.
  const window = []
  const start = Math.max(1, Math.min(page - 2, pages - 4))
  for (let p = start; p <= Math.min(pages, start + 4); p++) window.push(p)

  const arrow = 'p-2 rounded-lg border border-gray-300 text-gray-600 enabled:hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium text-gray-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-gray-700">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} className={arrow} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>

        {start > 1 && <span className="px-1 text-gray-400">…</span>}
        {window.map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`min-w-9 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              p === page
                ? 'bg-gradient-to-r from-[#6d28d9] to-[#5b21b6] text-white shadow-sm'
                : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        ))}
        {start + 4 < pages && <span className="px-1 text-gray-400">…</span>}

        <button onClick={() => onChange(page + 1)} disabled={page >= pages} className={arrow} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

/** Uniform table header cell used by every list page. */
export function Th({ children, className = '' }) {
  return (
    <th className={`text-left text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 whitespace-nowrap ${className}`}>
      {children}
    </th>
  )
}
