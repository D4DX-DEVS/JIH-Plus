import React, { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, Inbox,
  RotateCw, Search, SlidersHorizontal, X
} from 'lucide-react'
import NumericInput from '../NumericInput'
import { STATUS_LABEL, TYPE_TONE, cx } from '../../utils/members/format'

/**
 * Members portal design system ("royal ink"). Every members page composes these
 * primitives; colours come from the royal / ink / mist / line tokens declared in
 * index.css, so a palette change there re-skins the whole portal.
 *
 * Mobile-first rules baked in here: 44px touch targets on phones (40px on
 * desktop), 16px text in inputs on phones (iOS zoom guard lives in index.css),
 * bottom-sheet dialogs, and filters that fold behind one button.
 */

/** Rows every list page requests per page. */
export const PAGE_SIZE = 10


/* ── Layout ─────────────────────────────────────────────────────────────── */

/**
 * Page title row. `hideTitleOnMobile` is for pages whose title is already in the
 * Layout's mobile app bar. `primaryAction` ({ label, mobileLabel, icon, onClick })
 * renders as a header button on desktop and a floating button on phones.
 */
export function PageHeader({ title, subtitle, actions, hideTitleOnMobile, primaryAction, eyebrow }) {
  const mobileVisible = !hideTitleOnMobile || Boolean(actions)
  const PrimaryIcon = primaryAction?.icon
  return (
    <>
      <div className={cx(mobileVisible ? 'flex' : 'hidden lg:flex', 'mb-3 flex-wrap items-end justify-between gap-x-4 gap-y-2 lg:mb-6')}>
        <div className={cx('min-w-0', hideTitleOnMobile && 'hidden lg:block')}>
          {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-royal-600">{eyebrow}</p>}
          <h1 className="text-xl font-bold tracking-tight text-ink [overflow-wrap:anywhere] sm:text-[1.625rem] sm:leading-tight">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">{subtitle}</p>}
        </div>
        {(actions || primaryAction) && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {primaryAction && (
              <Button className="hidden lg:inline-flex" onClick={primaryAction.onClick}>
                {PrimaryIcon && <PrimaryIcon size={16} strokeWidth={2.4} />}
                {primaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
      {primaryAction && (
        <Fab icon={primaryAction.icon} label={primaryAction.mobileLabel || primaryAction.label} onClick={primaryAction.onClick} />
      )}
    </>
  )
}

/** Extended floating action button — phones only, above the bottom bar. */
export function Fab({ icon, label, onClick }) {
  const Icon = icon
  return (
    <button
      type="button"
      onClick={onClick}
      className="mbr-fab inline-flex h-14 items-center gap-2 rounded-2xl bg-royal-600 pl-4 pr-5 text-[15px] font-semibold text-white transition-colors active:bg-royal-800 lg:hidden"
    >
      {Icon && <Icon size={20} strokeWidth={2.4} />}
      <span>{label}</span>
    </button>
  )
}

export function Card({ children, className = '', as = 'div', ...props }) {
  const Tag = as
  return <Tag {...props} className={cx('mbr-card', className)}>{children}</Tag>
}

/** Card title row: optional tinted icon, title, subtitle and a trailing action. */
export function CardHeader({ title, subtitle, icon, tone = 'royal', action, className = '' }) {
  return (
    <div className={cx('flex items-start justify-between gap-3 px-4 pt-4 pb-3 sm:px-5', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <IconTile icon={icon} tone={tone} size="sm" />}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

const TONES = {
  royal: 'bg-royal-50 text-royal-700',
  gold: 'bg-amber-50 text-amber-700',
  green: 'bg-emerald-50 text-emerald-700',
  rose: 'bg-rose-50 text-rose-700',
  sky: 'bg-sky-50 text-sky-700',
  violet: 'bg-violet-50 text-violet-700',
  slate: 'bg-slate-100 text-slate-600',
  ink: 'bg-ink text-white'
}

/** Rounded square holding an icon, tinted by tone. */
export function IconTile({ icon, tone = 'royal', size = 'md', className = '' }) {
  const Icon = icon
  const box = size === 'sm' ? 'h-9 w-9 rounded-[10px]' : size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-xl'
  return (
    <span className={cx('flex shrink-0 items-center justify-center', box, TONES[tone] || TONES.royal, className)} aria-hidden="true">
      <Icon size={size === 'lg' ? 22 : 18} strokeWidth={2} />
    </span>
  )
}

/** Initials avatar; tone follows the record type where there is one. */
export function Avatar({ name, tone = 'royal', size = 'md', className = '' }) {
  const initials = String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || '?'
  const box = size === 'sm' ? 'h-8 w-8 text-[11px]' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-[13px]'
  return (
    <span className={cx('flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide', box, TONES[tone] || TONES.royal, className)} aria-hidden="true">
      {initials}
    </span>
  )
}

/**
 * One tappable list row: leading visual, title + meta, trailing badge and a
 * chevron. Pass `to` for a link, `onClick` for a button, neither for static.
 */
export function ListRow({ to, onClick, leading, title, meta, trailing, chevron = Boolean(to || onClick), className = '' }) {
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{title}</span>
        {meta && <span className="mt-0.5 block text-xs leading-snug text-slate-500 [overflow-wrap:anywhere]">{meta}</span>}
      </span>
      {trailing && <span className="flex shrink-0 flex-col items-end gap-1">{trailing}</span>}
      {chevron && <ChevronRight size={16} className="-mr-1 shrink-0 text-slate-300" aria-hidden="true" />}
    </>
  )
  const base = cx('flex w-full min-h-[60px] items-center gap-3 px-4 py-2.5 text-left transition-colors sm:px-5', className)
  if (to) return <Link to={to} className={cx(base, 'hover:bg-mist active:bg-royal-50/60')}>{body}</Link>
  if (onClick) return <button type="button" onClick={onClick} className={cx(base, 'hover:bg-mist active:bg-royal-50/60')}>{body}</button>
  return <div className={base}>{body}</div>
}

/* ── Buttons ────────────────────────────────────────────────────────────── */

const BUTTON_VARIANTS = {
  primary: 'bg-royal-600 text-white shadow-[0_1px_2px_rgba(15,23,42,0.12),0_4px_12px_rgba(42,75,214,0.22)] hover:bg-royal-700 active:bg-royal-800 disabled:bg-royal-300 disabled:shadow-none',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300/80 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:bg-mist hover:text-ink disabled:text-slate-400',
  soft: 'bg-royal-50 text-royal-700 hover:bg-royal-100 disabled:text-royal-300',
  danger: 'bg-rose-600 text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] hover:bg-rose-700 disabled:bg-rose-300',
  'danger-soft': 'bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:text-rose-300',
  success: 'bg-emerald-600 text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] hover:bg-emerald-700 disabled:bg-emerald-300',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-ink disabled:text-slate-300'
}

const BUTTON_SIZES = {
  sm: 'min-h-9 gap-1.5 rounded-[10px] px-3 text-[13px]',
  md: 'min-h-11 gap-2 rounded-xl px-4 text-sm lg:min-h-10',
  lg: 'min-h-12 gap-2 rounded-xl px-5 text-[15px]'
}

export function Button({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center whitespace-nowrap font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-royal-500/25 disabled:cursor-not-allowed',
        BUTTON_SIZES[size] || BUTTON_SIZES.md,
        BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary,
        className
      )}
    >
      {loading && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  )
}

const ICON_TONES = {
  default: 'text-slate-500 hover:bg-slate-100 hover:text-ink',
  royal: 'text-royal-600 hover:bg-royal-50',
  danger: 'text-slate-400 hover:bg-rose-50 hover:text-rose-600',
  success: 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
}

/** Square icon-only button with an accessible label (also used as tooltip). */
export function IconButton({ icon, label, tone = 'default', size = 18, className = '', ...props }) {
  const Icon = icon
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={cx(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-royal-500/25 disabled:opacity-40 lg:h-9 lg:w-9 lg:rounded-[10px]',
        ICON_TONES[tone] || ICON_TONES.default,
        className
      )}
    >
      <Icon size={size} />
    </button>
  )
}

/* ── Form controls ─────────────────────────────────────────────────────── */

/** Label wrapping its control, with an optional hint underneath. */
export function Field({ label, hint, children, required, className = '' }) {
  return (
    <label className={cx('block min-w-0', className)}>
      <span className="mb-1.5 block text-[13px] font-semibold leading-snug text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-slate-500">{hint}</span>}
    </label>
  )
}

const CONTROL = 'w-full min-h-11 rounded-xl border border-slate-300/90 bg-white px-3.5 py-2 text-base text-ink shadow-[0_1px_1px_rgba(15,23,42,0.03)] outline-none transition placeholder:text-slate-400 focus:border-royal-500 focus:ring-4 focus:ring-royal-500/15 disabled:bg-mist disabled:text-slate-500 disabled:shadow-none sm:text-sm lg:min-h-10'

function WithIcon({ icon, children }) {
  const Icon = icon
  if (!Icon) return children
  return (
    <span className="relative block">
      <Icon size={17} className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-slate-400" aria-hidden="true" />
      {children}
    </span>
  )
}

export function Input({ className = '', icon, ...props }) {
  return (
    <WithIcon icon={icon}>
      <NumericInput type="text" {...props} className={cx(CONTROL, icon && 'pl-10', className)} />
    </WithIcon>
  )
}

/** Password field with a show/hide eye. */
export function PasswordInput({ className = '', icon, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <WithIcon icon={icon}>
      <span className="relative block">
        <input {...props} type={show ? 'text' : 'password'} className={cx(CONTROL, 'pr-12', icon && 'pl-10', className)} />
        <button
          type="button"
          onClick={() => setShow(current => !current)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="mobile-compact-control absolute right-0.5 top-1/2 flex h-10 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
        >
          {show ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </span>
    </WithIcon>
  )
}

export function Textarea({ className = '', ...props }) {
  return <textarea {...props} className={cx(CONTROL, 'py-2.5 leading-relaxed', className)} />
}

/** Native select with a custom chevron. `className` sizes the wrapper. */
export function Select({ className = '', children, ...props }) {
  return (
    <span className={cx('relative block w-full', className)}>
      <select {...props} className={cx(CONTROL, 'appearance-none pr-10')}>{children}</select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
    </span>
  )
}

/** Search box with a magnifier and a clear button once something is typed. */
export function SearchInput({ className = '', value, onChange, ...props }) {
  return (
    <div className={cx('relative', className)}>
      <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        type="search"
        {...props}
        value={value}
        onChange={onChange}
        className={cx(CONTROL, 'pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange?.({ target: { value: '' } })}
          aria-label="Clear search"
          className="mobile-compact-control absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

/**
 * Switch row for a boolean setting: label, optional description, switch on the
 * right. The whole row is the tap target.
 */
export function ToggleRow({ checked, onChange, label, description, disabled = false }) {
  return (
    <label className={cx('flex min-h-[52px] cursor-pointer items-start gap-3 rounded-xl border border-line bg-white px-3.5 py-3', disabled && 'cursor-not-allowed opacity-60')}>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{description}</span>}
      </span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
      />
      <span
        aria-hidden="true"
        className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-royal-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-4 peer-focus-visible:ring-royal-500/25"
      />
    </label>
  )
}

/* ── Filters, chips and tabs ────────────────────────────────────────────── */

/**
 * One filter row for every list page. `search` sits on the left; `children`
 * (selects) sit inline from sm up and fold behind a filter button on phones.
 * `activeCount` badges that button; Clear appears once something filters.
 */
export function FilterBar({ search, children, onClear, active = false, activeCount = 0, className = '' }) {
  const [open, setOpen] = useState(false)
  const controls = React.Children.toArray(children).filter(Boolean)
  const hasControls = controls.length > 0
  const collapsible = Boolean(search) && hasControls
  const clear = active && onClear && (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[13px] font-semibold text-royal-700 hover:bg-royal-50 lg:min-h-10"
    >
      <X size={15} /> Clear
    </button>
  )

  return (
    <div className={cx('mb-3 flex flex-wrap items-center gap-2 sm:mb-4', className)}>
      {search && <div className="min-w-0 flex-1 basis-56">{search}</div>}
      {collapsible && (
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-label="Filters"
          className={cx(
            'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-colors sm:hidden',
            open || activeCount ? 'bg-royal-50 text-royal-700 ring-royal-200' : 'bg-white text-slate-600 ring-slate-300/80'
          )}
        >
          <SlidersHorizontal size={18} />
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-royal-600 px-1 text-[11px] font-bold leading-none text-white">
              {activeCount}
            </span>
          )}
        </button>
      )}
      {hasControls && (
        <div
          className={cx(
            collapsible && !open ? 'hidden' : 'grid',
            'w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center',
            collapsible && 'mbr-card mbr-fade-in p-2.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none'
          )}
        >
          {controls}
          {clear && <div className="col-span-2 flex justify-end sm:col-span-1">{clear}</div>}
        </div>
      )}
      {!hasControls && clear}
    </div>
  )
}

/**
 * Horizontally scrolling single-choice chips (status filters and the like).
 * Each option: { value, label, count?, dot? }.
 */
export function ChipGroup({ options, value, onChange, label, className = '' }) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('mbr-scroll-x -mx-3 gap-1.5 px-3 pb-0.5 sm:mx-0 sm:flex-wrap sm:px-0', className)}>
      {options.map(option => {
        const active = option.value === value
        return (
          <button
            key={option.value || 'all'}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'mobile-compact-control inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors',
              active
                ? 'bg-royal-600 text-white shadow-[0_2px_8px_rgba(42,75,214,0.25)]'
                : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:text-ink hover:ring-slate-300'
            )}
          >
            {option.dot && <span className={cx('h-1.5 w-1.5 rounded-full', active ? 'bg-white' : option.dot)} aria-hidden="true" />}
            {option.label}
            {option.count !== undefined && option.count !== null && (
              <span className={cx('rounded-full px-1.5 text-[11px] font-bold leading-[18px]', active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Segmented control (tabs). Scrolls sideways on phones rather than stacking. */
export function Tabs({ tabs, value, onChange, fill = false, className = '' }) {
  return (
    <div role="tablist" className={cx('mbr-scroll-x w-full gap-1 rounded-xl bg-slate-200/70 p-1', !fill && 'sm:inline-flex sm:w-auto', className)}>
      {tabs.map(tab => {
        const active = value === tab.value
        const TabIcon = tab.icon
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cx(
              'mobile-compact-control inline-flex min-h-9 flex-[1_0_auto] items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 text-[13px] font-semibold transition-all',
              active
                ? 'bg-white text-ink shadow-[0_1px_2px_rgba(15,23,42,0.1),0_1px_1px_rgba(15,23,42,0.04)]'
                : 'text-slate-500 hover:text-ink'
            )}
          >
            {TabIcon && <TabIcon size={15} />}
            {tab.label}
            {tab.badge !== undefined && (
              <span className={cx('rounded-full px-1.5 text-[11px] font-bold leading-[18px]', active ? 'bg-royal-50 text-royal-700' : 'bg-white/70 text-slate-500')}>
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ── Dialogs ────────────────────────────────────────────────────────────── */

/** Bottom sheet on phones, centred dialog from sm up. */
export function Modal({ open, onClose, title, subtitle, children, footer, wide }) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const dialog = dialogRef.current
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',')

    const focusInitial = () => {
      const preferred = dialog?.querySelector('[autofocus], [data-modal-initial-focus]')
      const firstField = dialog?.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])')
      ;(preferred || firstField || dialog)?.focus({ preventScroll: true })
    }
    const frame = window.requestAnimationFrame(focusInitial)

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current?.()
        return
      }
      if (e.key !== 'Tab' || !dialog) return

      const focusable = [...dialog.querySelectorAll(focusableSelector)]
        .filter(element => element.getClientRects().length > 0)
      if (focusable.length === 0) {
        e.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const focusIsOutside = !dialog.contains(document.activeElement)
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog || focusIsOutside)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (document.activeElement === last || focusIsOutside)) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      const previousFocus = previousFocusRef.current
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="mbr-fade-in absolute inset-0 bg-ink/50 backdrop-blur-[3px]" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'mbr-sheet-in relative flex max-h-[92dvh] w-full flex-col rounded-t-[1.5rem] bg-[#fff] shadow-[0_-8px_40px_rgba(11,20,48,0.22)] outline-none sm:rounded-[1.25rem] sm:shadow-[0_24px_64px_rgba(11,20,48,0.28)]',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-2.5 sm:px-6 sm:pt-5">
          <div className="min-w-0 pt-1.5 sm:pt-0.5">
            <h3 id={titleId} className="text-base font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
          </div>
          <IconButton icon={X} label="Close dialog" onClick={onClose} className="-mr-2 -mt-0.5 sm:-mt-1.5" size={20} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6 sm:pb-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap gap-2 border-t border-line px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:justify-end sm:px-6 sm:py-4 [&>*]:flex-1 sm:[&>*]:flex-none">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Feedback ───────────────────────────────────────────────────────────── */

export function Spinner({ label = 'Loading...' }) {
  return (
    <div className="py-16 text-center" role="status">
      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-royal-100 border-t-royal-600" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={cx('mbr-skeleton rounded-lg', className)} aria-hidden="true" />
}

/** Placeholder rows shaped like ListRow while a list loads. */
export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-line" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, message, action, icon = Inbox }) {
  const Icon = icon
  return (
    <div className="px-6 py-12 text-center sm:py-16">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-royal-50 text-royal-600" aria-hidden="true">
        <Icon size={22} />
      </span>
      <p className="font-semibold text-ink">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-500">{message}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="px-6 py-12 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600" aria-hidden="true">
        <AlertTriangle size={22} />
      </span>
      <p className="mx-auto max-w-sm text-sm leading-relaxed text-rose-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw size={14} /> Try again
        </Button>
      )}
    </div>
  )
}

/** Inline notice: tone = info | warning | success | danger. */
export function Notice({ tone = 'info', icon, title, children, className = '' }) {
  const Icon = icon
  const look = {
    info: 'bg-royal-50 text-royal-900 ring-royal-200/70',
    warning: 'bg-amber-50 text-amber-900 ring-amber-200/80',
    success: 'bg-emerald-50 text-emerald-900 ring-emerald-200/80',
    danger: 'bg-rose-50 text-rose-900 ring-rose-200/80'
  }[tone]
  return (
    <div className={cx('flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm leading-relaxed ring-1 ring-inset', look, className)}>
      {Icon && <Icon size={17} className="mt-0.5 shrink-0 opacity-80" aria-hidden="true" />}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
    </div>
  )
}

/* ── Badges ─────────────────────────────────────────────────────────────── */

const STATUS_STYLES = {
  submitted: ['bg-sky-50 text-sky-700 ring-sky-600/15', 'bg-sky-500'],
  in_review: ['bg-amber-50 text-amber-800 ring-amber-600/20', 'bg-amber-500'],
  approved: ['bg-emerald-50 text-emerald-700 ring-emerald-600/15', 'bg-emerald-500'],
  rejected: ['bg-rose-50 text-rose-700 ring-rose-600/15', 'bg-rose-500'],
  hold: ['bg-slate-100 text-slate-700 ring-slate-500/15', 'bg-slate-400'],
  active: ['bg-emerald-50 text-emerald-700 ring-emerald-600/15', 'bg-emerald-500'],
  used: ['bg-royal-50 text-royal-700 ring-royal-600/15', 'bg-royal-500'],
  blocked: ['bg-rose-50 text-rose-700 ring-rose-600/15', 'bg-rose-500'],
  expired: ['bg-slate-100 text-slate-600 ring-slate-500/15', 'bg-slate-400'],
  inactive: ['bg-slate-100 text-slate-600 ring-slate-500/15', 'bg-slate-400']
}

/** Dot + label pill for application and link statuses. */
export function StatusBadge({ status }) {
  const [look, dot] = STATUS_STYLES[status] || STATUS_STYLES.hold
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', look)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', dot)} aria-hidden="true" />
      {STATUS_LABEL[status] || String(status || '').replace(/_/g, ' ')}
    </span>
  )
}

const BADGE_TONES = {
  royal: 'bg-royal-50 text-royal-700 ring-royal-600/15',
  gold: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/15'
}

export function Badge({ tone = 'slate', className = '', children }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset', BADGE_TONES[tone] || BADGE_TONES.slate, className)}>
      {children}
    </span>
  )
}

export function TypeBadge({ type }) {
  return <Badge tone={TYPE_TONE[type] || 'slate'}>{type === 'karkoon' ? 'Karkun' : type === 'rukn' ? 'Rukn' : type || '—'}</Badge>
}

/* ── Tables and paging ──────────────────────────────────────────────────── */

/** Table that scrolls horizontally on its own rather than the page body. */
export function TableWrap({ children }) {
  return <div className="overflow-x-auto rounded-b-[inherit]">{children}</div>
}

/** Uniform table header cell used by every list page. */
export function Th({ children, className = '' }) {
  return (
    <th className={cx('whitespace-nowrap border-b border-line bg-mist/70 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 first:pl-5 last:pr-5', className)}>
      {children}
    </th>
  )
}

/**
 * Server-side pager shared by every list page. Renders nothing when everything
 * fits on one page. Phones get prev / "page x of y" / next.
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

  const arrow = 'inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-inset ring-slate-300/80 transition-colors enabled:hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40 lg:h-9 lg:w-9 lg:rounded-[10px]'

  return (
    <div className="mt-3 flex items-center justify-between gap-3 sm:mt-4">
      <p className="text-[13px] text-slate-500">
        <span className="sm:hidden">Page <span className="font-semibold text-ink">{page}</span> of {pages}</span>
        <span className="hidden sm:inline">
          Showing <span className="font-semibold text-ink">{from}–{to}</span> of <span className="font-semibold text-ink">{total}</span>
        </span>
      </p>

      <div className="flex items-center gap-1.5">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} className={arrow} aria-label="Previous page">
          <ChevronLeft size={17} />
        </button>

        <div className="hidden items-center gap-1.5 sm:flex">
          {start > 1 && <span className="px-1 text-slate-400">…</span>}
          {window.map(p => (
            <button
              key={p}
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cx(
                'inline-flex h-9 min-w-9 items-center justify-center rounded-[10px] px-2.5 text-[13px] font-semibold transition-colors',
                p === page ? 'bg-royal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:ring-1 hover:ring-inset hover:ring-slate-300/80'
              )}
            >
              {p}
            </button>
          ))}
          {start + 4 < pages && <span className="px-1 text-slate-400">…</span>}
        </div>

        <button onClick={() => onChange(page + 1)} disabled={page >= pages} className={arrow} aria-label="Next page">
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  )
}
