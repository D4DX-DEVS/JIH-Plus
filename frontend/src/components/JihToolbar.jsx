import React, { useState } from 'react';
import { Search, SlidersHorizontal, ChevronDown, Filter, Plus, X } from 'lucide-react';

/**
 * Search / filter / add primitives for the JIH expansion portal.
 *
 * Mirrors the ihthisabi toolbar so both portals feel identical on a phone:
 *  - one row = pill search field + (mobile-only) filter toggle + trailing actions
 *  - filter selects sit in a 2-col grid, collapsed on phones until toggled and
 *    always visible from sm:
 *  - the add action is a floating button above the bottom nav below lg, and a
 *    regular pill button in the page/desktop header from lg.
 */
export function JihFilterBar({
  search,
  onSearchChange,
  placeholder = 'Search…',
  activeFilterCount = 0,
  onClear,
  actions = null,
  children,
  className = '',
  gridClass = 'sm:grid-cols-3 lg:grid-cols-4',
}) {
  const [open, setOpen] = useState(false);
  const hasFilters = React.Children.toArray(children).some(Boolean);

  return (
    <div className={`ih-surface jih-toolbar p-2.5 sm:p-3 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="ih-filter-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className={`ih-field h-[44px] text-base sm:h-9 sm:text-sm ${search ? 'pr-10' : 'pr-3'}`}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="ih-icon-btn absolute right-1 top-1/2 -translate-y-1/2 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Toggle filters"
            className={`inline-flex h-[44px] shrink-0 items-center gap-1 rounded-full px-3 text-[11px] font-medium transition-colors sm:hidden ${
              activeFilterCount > 0 ? 'bg-[#002349]/10 text-[#002349]' : 'text-gray-500'
            }`}
            style={activeFilterCount > 0 ? undefined : { backgroundColor: 'rgba(16,24,40,0.04)' }}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </button>
        )}

        {actions}
      </div>

      {hasFilters && (
        <div className={`${open ? 'grid' : 'hidden'} mt-2 grid-cols-2 gap-2 sm:!grid ${gridClass}`}>
          {children}
          {onClear && activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center justify-center rounded-full px-3 py-[10px] text-[13px] font-medium text-gray-500 transition-colors hover:text-red-600 sm:py-[7px] sm:text-sm"
              style={{ backgroundColor: 'rgba(16,24,40,0.04)' }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** One filter control: leading icon + filled pill select + trailing chevron. */
export function JihFilterSelect({ icon, className = '', children, ...props }) {
  const Icon = icon || Filter;
  return (
    <div className={`relative ${className}`}>
      <Icon className="ih-filter-icon" />
      <select className="ih-filter-select truncate" {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

/** Trailing icon-only action for the search row (export, refresh, …). */
export function JihToolbarAction({ icon, label, onClick, disabled = false, className = '' }) {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-[#002349] text-white transition-colors hover:bg-[#1a3a5c] disabled:opacity-50 sm:h-9 sm:w-9 ${className}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** Floating add button — phones/tablets only (below lg), parked above the bottom nav. */
export function JihFab({ onClick, label, icon, disabled = false }) {
  const Icon = icon || Plus;
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label} className="jih-fab">
      <Icon className="h-5 w-5" />
    </button>
  );
}

/** Desktop add button — the lg+ counterpart of JihFab. Pass className to change visibility. */
export function JihAddButton({ onClick, icon, children, className = 'hidden lg:inline-flex', disabled = false }) {
  const Icon = icon || Plus;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${className} h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#002349] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a3a5c] disabled:opacity-50`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
