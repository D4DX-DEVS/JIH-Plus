import React, { useLayoutEffect, useRef, useState } from 'react';
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
  searchLabel = 'Search',
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
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="flex items-center gap-2 lg:min-w-[16rem] lg:flex-1">
        <div className="relative min-w-0 flex-1">
          <Search className="ih-filter-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            aria-label={searchLabel}
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
            className={`inline-flex h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-[11px] font-medium transition-colors sm:hidden ${
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
        <div className={`${open ? 'grid' : 'hidden'} grid-cols-2 gap-2 sm:!grid ${gridClass} lg:!flex lg:flex-wrap lg:items-center lg:*:w-56`}>
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
    </div>
  );
}

/**
 * One filter control: leading icon + filled pill select + trailing chevron.
 *
 * Below sm a native select can only ellipsize, which cut long Malayalam labels
 * ("എല്ലാ ജില്ല…"). There the select keeps its 16px iOS-zoom-guard font but
 * paints its text transparent, and a smaller copy of the chosen option is
 * stacked over it in the same grid cell, wrapping instead of truncating. The
 * select still receives every tap, so the native picker is unchanged.
 */
export function JihFilterSelect({ icon, className = '', label = 'Filter', children, 'aria-label': ariaLabel, onChange, ...props }) {
  const Icon = icon || Filter;
  const selectRef = useRef(null);
  const [shownLabel, setShownLabel] = useState('');
  const syncLabel = () => setShownLabel(selectRef.current?.selectedOptions[0]?.text ?? '');

  // Options often arrive async, so re-read after every render; an unchanged
  // string makes setState a no-op.
  useLayoutEffect(syncLabel);

  return (
    <div className={`relative grid ${className}`}>
      <select
        ref={selectRef}
        className="ih-filter-select jih-filter-select truncate [grid-area:1/1] h-full"
        aria-label={ariaLabel || label}
        onChange={(e) => { syncLabel(); onChange?.(e); }}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden="true"
        className={`pointer-events-none flex items-center py-1.5 pl-8 pr-7 text-[12px] leading-[1.3] [grid-area:1/1] [overflow-wrap:anywhere] sm:hidden ${
          props.disabled ? 'text-gray-400 opacity-60' : 'text-gray-700'
        }`}
      >
        {shownLabel}
      </span>
      <Icon className="ih-filter-icon" />
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
