import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

/**
 * Form primitives for the login pages, matching the portal design: pill tabs,
 * a tinted info banner, icon-led text fields, and navy / soft buttons. Every
 * control is at least 44px tall so it works on the phones most users are on.
 */

const PRIMARY_FILL =
  'bg-gradient-to-r from-[#1d4fa8] to-[#0f347d] text-white shadow-[0_10px_24px_rgba(15,52,125,0.28)]';

/** Two-way switch. `solid` = navy active pill; `soft` = white tray, light-blue active segment. */
export function AuthTabs({ tabs, value, onChange, variant = 'solid', label = 'Login type' }) {
  const soft = variant === 'soft';

  return (
    <div
      role="group"
      aria-label={label}
      className={
        soft
          ? 'grid grid-cols-2 gap-1 rounded-2xl border border-[#dfe5f0] bg-white/90 p-1.5 shadow-[0_8px_24px_rgba(30,56,110,0.06)]'
          : 'grid grid-cols-2 gap-3'
      }
    >
      {tabs.map(({ value: tabValue, label: tabLabel, icon: Icon, id, controls }) => {
        const active = tabValue === value;
        const look = soft
          ? active
            ? 'rounded-xl bg-[#e6eefb] text-[#1d4fa8]'
            : 'rounded-xl text-[#1f3560] hover:bg-[#f3f6fb]'
          : active
            ? `rounded-2xl ${PRIMARY_FILL}`
            : 'rounded-2xl bg-[#e9edf5] text-[#1f3560] hover:bg-[#dfe5f0]';

        return (
          <button
            key={tabValue}
            type="button"
            id={id}
            aria-pressed={active}
            aria-controls={controls}
            onClick={() => onChange(tabValue)}
            className={`inline-flex min-h-[48px] items-center justify-center gap-2.5 px-3 text-[15px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a5fc4]/40 ${look}`}
          >
            {Icon && <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />}
            <span>{tabLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AuthInfoBanner({ icon, title, description }) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-[#e8effb] px-4 py-3">
      <span className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-[#d5e2f7] text-[#2a5fc4]" aria-hidden="true">
        <Icon className="h-6 w-6" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-bold leading-snug text-[#10274f]">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-[#5b6b85]">{description}</p>
      </div>
    </div>
  );
}

/**
 * Labelled input with a leading icon. `type="password"` adds the show/hide
 * toggle. `invalid` / `describedBy` wire the field to an <AuthError> by id.
 */
export function AuthField({
  id,
  label,
  required = false,
  showRequiredMark = true,
  icon: Icon,
  type = 'text',
  hint,
  invalid = false,
  describedBy,
  className = '',
  ...inputProps
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-[15px] font-bold text-[#10274f]">
        {label}
        {required && showRequiredMark && <span className="ml-1 text-[#e11d48]" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b7a90]"
            strokeWidth={1.9}
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          required={required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`min-h-[48px] w-full rounded-2xl border bg-white/95 py-2.5 text-base text-[#10274f] outline-none transition placeholder:text-[#8a96ab] focus:border-[#2a5fc4] focus:ring-2 focus:ring-[#2a5fc4]/20 disabled:bg-[#f3f5fa] ${
            Icon ? 'pl-12' : 'pl-4'
          } ${isPassword ? 'pr-12' : 'pr-4'} ${invalid ? 'border-[#f2a4b4]' : 'border-[#d5dce8]'}`}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((current) => !current)}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[#6b7a90] transition hover:text-[#10274f]"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <Eye className="h-5 w-5" strokeWidth={1.9} /> : <EyeOff className="h-5 w-5" strokeWidth={1.9} />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-[#6b7a90]">{hint}</p>}
    </div>
  );
}

export function AuthError({ id, message }) {
  return (
    <div id={id} role="alert" aria-live="assertive" className="flex items-start gap-2 rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#e11d48]" aria-hidden="true" />
      <p className="text-sm font-medium text-[#be123c]">{message}</p>
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary: `${PRIMARY_FILL} hover:from-[#2359b9] hover:to-[#123d90] disabled:from-[#9fb3d6] disabled:to-[#9fb3d6] disabled:shadow-none`,
  secondary: 'bg-[#e9edf5] text-[#1f3560] hover:bg-[#dfe5f0] disabled:opacity-60',
};

export function AuthButton({ variant = 'primary', loading = false, loadingLabel = 'Please wait...', className = '', children, disabled, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-2xl px-5 text-[16px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a5fc4]/40 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function AuthCheckbox({ id, label, ...props }) {
  return (
    <label htmlFor={id} className="inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[15px] font-medium text-[#1f3560]">
      <input id={id} type="checkbox" className="h-5 w-5 rounded-md border-[#c7d0df] accent-[#1d4fa8]" {...props} />
      <span>{label}</span>
    </label>
  );
}
